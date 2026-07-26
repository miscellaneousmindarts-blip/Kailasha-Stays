/**
 * Seeds two sample properties (with photos, sections, add-ons, contacts and
 * private info) so the site has realistic content to develop against.
 *
 * Usage:  npm run seed
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local — it writes past RLS.
 * Safe to re-run: it deletes the two seed slugs first.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- env -------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "\n  Missing SUPABASE_SERVICE_ROLE_KEY (or URL) in .env.local.\n" +
      "  Supabase dashboard → Project Settings → API keys → service_role.\n",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// --- sample content --------------------------------------------------------
const PROPERTIES = [
  {
    slug: "riverside-2bhk-parikrama-marg",
    title: "Riverside 2BHK on Parikrama Marg",
    status: "published",
    summary:
      "Bright two-bedroom apartment a five-minute walk from Parikrama Marg, with a balcony that catches the morning breeze.",
    description:
      "A calm, freshly renovated 2BHK for families and small groups visiting Vrindavan. The living room opens onto a balcony overlooking a quiet lane, and both bedrooms have blackout curtains and reliable air conditioning.\n\nThe kitchen is fully equipped if you prefer to cook satvik meals yourself, and our caretaker Ramesh ji lives two buildings away for anything you need.",
    property_type: "Apartment",
    max_guests: 5,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2,
    base_price: 3200,
    amenities: [
      "wifi",
      "air_conditioning",
      "kitchen",
      "washing_machine",
      "parking",
      "power_backup",
      "hot_water",
      "workspace",
      "balcony",
      "tv",
    ],
    house_rules:
      "No smoking indoors. Non-vegetarian food and alcohol are not permitted. Quiet hours after 10 pm.",
    area: "Parikrama Marg",
    city: "Vrindavan",
    lat: 27.5806,
    lng: 77.7006,
    gmaps_url: "https://maps.google.com/?q=Parikrama+Marg,+Vrindavan",
    airbnb_url: "https://www.airbnb.co.in/rooms/00000000",
    sort_order: 1,
    private: {
      exact_address:
        "Flat 302, Gokul Residency, Lane 4, Parikrama Marg, Vrindavan 281121",
      exact_gmaps_url: "https://maps.google.com/?q=27.5806,77.7006",
      directions_note:
        "Enter Lane 4 opposite the Kesi Ghat parking. Gokul Residency is the cream building with a blue gate. Take the lift to the third floor.",
      wifi_name: "GokulResidency_302",
      wifi_password: "radhe1234",
      door_code: "2210",
      other_notes:
        "Water is filtered at the kitchen tap. The geyser takes about ten minutes to heat.",
    },
    contacts: [
      { name: "Ramesh Sharma", role: "Caretaker", phone: "+919876543210", sort_order: 1 },
      { name: "Kamal", role: "Host", phone: "+919876500000", sort_order: 2 },
      { name: "Dr. Verma Clinic", role: "Nearest clinic", phone: "+919812345678", sort_order: 3 },
    ],
    sections: [
      {
        title: "Getting around",
        type: "paragraph",
        audience: "public",
        sort_order: 1,
        content: {
          text: "Banke Bihari Mandir is a 12-minute walk through the old bazaar, or a five-minute e-rickshaw ride for about ₹30. Auto-rickshaws to Mathura junction wait at the end of the lane from 6 am.",
        },
      },
      {
        title: "What makes this place special",
        type: "list",
        audience: "public",
        sort_order: 2,
        content: {
          style: "check",
          items: [
            "Walking distance to Parikrama Marg and Kesi Ghat",
            "Inverter backup covers fans, lights and wifi",
            "Filtered drinking water in the kitchen",
            "Caretaker available on call all day",
          ],
        },
      },
      {
        title: "Distances",
        type: "key_value",
        audience: "public",
        sort_order: 3,
        content: {
          rows: [
            { label: "Banke Bihari Mandir", value: "900 m — 12 min walk" },
            { label: "Prem Mandir", value: "3.4 km — 10 min by auto" },
            { label: "ISKCON Vrindavan", value: "2.8 km — 8 min by auto" },
            { label: "Mathura Junction", value: "14 km — 35 min by car" },
          ],
        },
      },
      {
        title: "Good to know",
        type: "faq",
        audience: "public",
        sort_order: 4,
        content: {
          items: [
            {
              q: "Is early check-in possible?",
              a: "Usually yes if the flat is free the previous night. Message us a day ahead and we will confirm.",
            },
            {
              q: "Do you arrange airport pickup?",
              a: "Yes — we can arrange a car from Delhi or Agra airport as an add-on service. Ask us for the current rate.",
            },
            {
              q: "Is the water supply reliable?",
              a: "The building has an overhead tank filled twice daily, so there is water round the clock.",
            },
          ],
        },
      },
      {
        title: "Using the appliances",
        type: "list",
        audience: "guest",
        sort_order: 5,
        content: {
          style: "bullet",
          items: [
            "Geyser switch is outside each bathroom — turn it off after use.",
            "The AC remote for the second bedroom is in the bedside drawer.",
            "During a power cut the inverter runs fans, lights and wifi only, not the AC.",
            "Washing machine: use the 'Quick 30' cycle, detergent is under the sink.",
          ],
        },
      },
    ],
  },
  {
    slug: "garden-studio-near-prem-mandir",
    title: "Garden Studio near Prem Mandir",
    status: "published",
    summary:
      "A quiet studio for two opening onto a small garden, ten minutes from Prem Mandir.",
    description:
      "Perfect for a couple or a solo traveller on a longer stay. The studio has a proper writing desk, a compact kitchenette, and a shaded sit-out in the garden where the tulsi plants get the morning sun.\n\nThe lane is residential and genuinely quiet at night, which is rare this close to the temples.",
    property_type: "Studio",
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    base_price: 1900,
    amenities: [
      "wifi",
      "air_conditioning",
      "kitchen",
      "parking",
      "hot_water",
      "workspace",
      "garden",
      "power_backup",
    ],
    house_rules:
      "No smoking. Please keep the garden gate latched. Quiet hours after 10 pm.",
    area: "Chhatikara Road",
    city: "Vrindavan",
    lat: 27.5735,
    lng: 77.6805,
    gmaps_url: "https://maps.google.com/?q=Chhatikara+Road,+Vrindavan",
    airbnb_url: "https://www.airbnb.co.in/rooms/00000001",
    sort_order: 2,
    private: {
      exact_address:
        "Studio B, Tulsi Kunj, Gali 2, Chhatikara Road, Vrindavan 281121",
      exact_gmaps_url: "https://maps.google.com/?q=27.5735,77.6805",
      directions_note:
        "Turn into Gali 2 just after the Vrindavan Chandrodaya gate. Tulsi Kunj has a green door; the studio is the ground-floor unit on the right.",
      wifi_name: "TulsiKunj_Guest",
      wifi_password: "vrindavan28",
      door_code: null,
      other_notes: "The garden tap is on the left of the sit-out.",
    },
    contacts: [
      { name: "Sunita Devi", role: "Caretaker", phone: "+919876511111", sort_order: 1 },
      { name: "Kamal", role: "Host", phone: "+919876500000", sort_order: 2 },
    ],
    sections: [
      {
        title: "Ideal for longer stays",
        type: "paragraph",
        audience: "public",
        sort_order: 1,
        content: {
          text: "Guests staying a week or more get a discounted weekly rate and a mid-stay linen change. Message us before booking and we will work out the price.",
        },
      },
      {
        title: "Distances",
        type: "key_value",
        audience: "public",
        sort_order: 2,
        content: {
          rows: [
            { label: "Prem Mandir", value: "1.1 km — 10 min walk" },
            { label: "ISKCON Vrindavan", value: "1.6 km — 5 min by auto" },
            { label: "Banke Bihari Mandir", value: "4 km — 15 min by auto" },
          ],
        },
      },
      {
        title: "Where to eat nearby",
        type: "link_list",
        audience: "both",
        sort_order: 3,
        content: {
          links: [
            {
              label: "Govinda's (ISKCON)",
              url: "https://maps.google.com/?q=Govindas+ISKCON+Vrindavan",
              note: "Satvik thali, open 12–3 pm and 7–9 pm",
            },
            {
              label: "MVT Bakery",
              url: "https://maps.google.com/?q=MVT+Vrindavan",
              note: "Breakfast and good coffee",
            },
          ],
        },
      },
    ],
  },
];

const ADDONS = [
  {
    property_id: null,
    name: "Car rental with driver",
    description:
      "Air-conditioned sedan with a local driver for temple visits or an airport transfer.",
    price: 2500,
    price_unit: "per day",
    sort_order: 1,
  },
  {
    property_id: null,
    name: "Mandir pooja arrangement",
    description:
      "We arrange the pooja samagri and a pandit ji at the temple of your choice.",
    price: 1100,
    price_unit: "per pooja",
    sort_order: 2,
  },
  {
    property_id: null,
    name: "Airport pickup (Delhi)",
    description: "Door-to-door pickup from Delhi airport, about 3.5 hours.",
    price: 5500,
    price_unit: "per trip",
    sort_order: 3,
  },
  {
    property_id: null,
    name: "Home-cooked satvik meals",
    description: "Fresh vegetarian lunch or dinner prepared in the apartment.",
    price: 350,
    price_unit: "per person per meal",
    sort_order: 4,
  },
];

// --- photos ----------------------------------------------------------------
// Downloads a few realistic interior photos; falls back to a generated
// gradient so the seed still works offline.
const PHOTO_IDS = [1048, 1029, 164, 1080, 326, 431];

async function fetchPhoto(index) {
  const id = PHOTO_IDS[index % PHOTO_IDS.length];
  try {
    const res = await fetch(`https://picsum.photos/id/${id}/1600/1200`, {
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      return { body: Buffer.from(await res.arrayBuffer()), type: "image/jpeg", ext: "jpg" };
    }
  } catch {
    // offline — fall through
  }
  const hues = [24, 38, 12, 200, 150, 280];
  const h = hues[index % hues.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${h},45%,72%)"/>
      <stop offset="100%" stop-color="hsl(${h + 20},40%,52%)"/>
    </linearGradient></defs>
    <rect width="1600" height="1200" fill="url(#g)"/>
  </svg>`;
  return { body: Buffer.from(svg), type: "image/svg+xml", ext: "svg" };
}

// --- run -------------------------------------------------------------------
async function main() {
  console.log("Seeding…");

  for (const p of PROPERTIES) {
    const { private: priv, contacts, sections, ...propertyRow } = p;

    // clean re-run
    const { data: existing } = await db
      .from("properties")
      .select("id")
      .eq("slug", p.slug)
      .maybeSingle();

    if (existing) {
      await db.storage
        .from("property-images")
        .remove(
          (
            (await db.storage.from("property-images").list(existing.id)).data ?? []
          ).map((f) => `${existing.id}/${f.name}`),
        );
      await db.from("properties").delete().eq("id", existing.id);
    }

    const { data: property, error } = await db
      .from("properties")
      .insert(propertyRow)
      .select()
      .single();
    if (error) throw new Error(`${p.slug}: ${error.message}`);

    await db.from("property_private").insert({ property_id: property.id, ...priv });
    await db
      .from("property_contacts")
      .insert(contacts.map((c) => ({ ...c, property_id: property.id })));
    await db
      .from("property_sections")
      .insert(sections.map((s) => ({ ...s, property_id: property.id })));

    // photos
    const offset = PROPERTIES.indexOf(p) * 3;
    for (let i = 0; i < 3; i++) {
      const photo = await fetchPhoto(offset + i);
      const path = `${property.id}/photo-${i + 1}.${photo.ext}`;
      const { error: upErr } = await db.storage
        .from("property-images")
        .upload(path, photo.body, { contentType: photo.type, upsert: true });
      if (upErr) throw new Error(`upload ${path}: ${upErr.message}`);

      await db.from("property_images").insert({
        property_id: property.id,
        storage_path: path,
        alt: `${property.title} — photo ${i + 1}`,
        is_cover: i === 0,
        sort_order: i,
      });
    }

    console.log(`  ✓ ${property.title}`);
  }

  // add-ons (global): replace the seed set
  await db.from("addon_services").delete().is("property_id", null);
  const { error: addonErr } = await db.from("addon_services").insert(ADDONS);
  if (addonErr) throw new Error(`addons: ${addonErr.message}`);
  console.log(`  ✓ ${ADDONS.length} add-on services`);

  console.log("Done.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message, "\n");
  process.exit(1);
});
