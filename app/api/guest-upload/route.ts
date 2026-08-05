import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DOCS_PER_BOOKING = 15;

/**
 * How long a guest may view, rename or remove their own upload — after this,
 * it's locked in. Long enough to fix a mis-tap or wrong file right after
 * uploading; short enough that it can't be used to tamper with a document
 * days later. Mirrors the window in components/guest-portal/documents-section
 * .tsx, which hides the controls client-side once it elapses — this is the
 * check that actually matters, since the client's clock isn't trusted.
 */
const EDIT_WINDOW_MS = 30 * 60 * 1000;

/**
 * Resolves a portal token to a booking id via the same SECURITY DEFINER RPC
 * the portal page itself uses — it already checks for cancelled/expired
 * tokens, so a rejected token here behaves identically to an invalid one on
 * the page. Shared by every handler below: none of them trust a booking id
 * or document id passed straight from the client without this.
 */
async function resolveBookingId(token: string): Promise<string | null> {
  if (!token || token.length < 8) return null;
  const publicSupabase = createPublicClient();
  const { data: bundle, error } = await publicSupabase.rpc("get_booking_by_token", {
    p_token: token,
  });
  if (error || !bundle) return null;
  return (bundle as { booking: { id: string } }).booking.id;
}

/**
 * The one shared authorization step for GET/PATCH/DELETE: the token has to
 * resolve to a booking, the document has to belong to that booking (not just
 * exist), and it has to be within the edit window. Any failure collapses to
 * the same "not found" response — a guest fishing for other bookings'
 * document ids learns nothing from the difference.
 */
async function loadEditableDocument(token: string, docId: string) {
  const bookingId = await resolveBookingId(token);
  if (!bookingId) return { error: "Invalid or expired link." as const };

  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("guest_documents")
    .select("id, booking_id, storage_path, uploaded_at")
    .eq("id", docId)
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (!doc) return { error: "Document not found." as const };

  const age = Date.now() - new Date(doc.uploaded_at).getTime();
  if (age > EDIT_WINDOW_MS) {
    return { error: "This can no longer be changed — the 30-minute window has passed." as const };
  }

  return { admin, doc };
}

/**
 * Guest ID upload — no session, authorized purely by knowing a valid portal
 * token. Files land in the PRIVATE guest-docs bucket via the service-role
 * client (guests have no storage write access of their own); only admins can
 * ever read them back, and this route never returns a file URL to the guest.
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const file = formData.get("file");

  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Please upload a JPEG, PNG or PDF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be under 5MB." }, { status: 400 });
  }

  const bookingId = await resolveBookingId(token);
  if (!bookingId) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }

  const admin = createAdminClient();

  const { count } = await admin
    .from("guest_documents")
    .select("id", { count: "exact", head: true })
    .eq("booking_id", bookingId);
  if ((count ?? 0) >= MAX_DOCS_PER_BOOKING) {
    return NextResponse.json(
      { error: "Too many documents uploaded for this booking already." },
      { status: 429 },
    );
  }

  const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${bookingId}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("guest-docs")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await admin
    .from("guest_documents")
    .insert({
      booking_id: bookingId,
      guest_name: guestName || null,
      doc_type: "govt_id",
      storage_path: path,
    })
    .select("id, guest_name, uploaded_at")
    .single();
  if (insertError || !inserted) {
    await admin.storage.from("guest-docs").remove([path]);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    document: {
      id: inserted.id,
      guest_name: inserted.guest_name,
      uploaded_at: inserted.uploaded_at,
    },
  });
}

/** A short-lived signed URL so the guest can view what they uploaded. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing document." }, { status: 400 });

  const result = await loadEditableDocument(token, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const { data, error } = await result.admin.storage
    .from("guest-docs")
    .createSignedUrl(result.doc.storage_path, 120);
  if (error || !data) {
    return NextResponse.json({ error: "Could not open that document." }, { status: 500 });
  }

  return NextResponse.json({ success: true, url: data.signedUrl });
}

/** Rename the guest on an upload — the file itself doesn't change. */
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  const id = String(body?.id ?? "");
  const guestName = String(body?.guest_name ?? "").trim();

  const result = await loadEditableDocument(token, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const { error } = await result.admin
    .from("guest_documents")
    .update({ guest_name: guestName || null })
    .eq("id", result.doc.id);
  if (error) {
    return NextResponse.json({ error: "Could not save that change." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Remove an upload entirely — the guest re-uploads if they need to replace it. */
export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "");
  const id = String(body?.id ?? "");

  const result = await loadEditableDocument(token, id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  await result.admin.storage.from("guest-docs").remove([result.doc.storage_path]);

  const { error } = await result.admin
    .from("guest_documents")
    .delete()
    .eq("id", result.doc.id);
  if (error) {
    return NextResponse.json({ error: "Could not remove that document." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
