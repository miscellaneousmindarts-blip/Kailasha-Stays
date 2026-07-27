import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DOCS_PER_BOOKING = 15;

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

  // Validate the token and resolve the booking id via the same
  // SECURITY DEFINER RPC the portal page itself uses — it already checks
  // for cancelled/expired tokens, so a rejected token here behaves
  // identically to an invalid one on the page.
  const publicSupabase = createPublicClient();
  const { data: bundle, error: rpcError } = await publicSupabase.rpc(
    "get_booking_by_token",
    { p_token: token },
  );
  if (rpcError || !bundle) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 404 });
  }
  const bookingId = (bundle as { booking: { id: string } }).booking.id;

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

  const { error: insertError } = await admin.from("guest_documents").insert({
    booking_id: bookingId,
    guest_name: guestName || null,
    doc_type: "govt_id",
    storage_path: path,
  });
  if (insertError) {
    await admin.storage.from("guest-docs").remove([path]);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
