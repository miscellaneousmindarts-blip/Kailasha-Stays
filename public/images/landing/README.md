# Landing page photographs

Drop your real photos in this folder, **keeping the same filenames**. Nothing
else needs changing — the page picks them up automatically on the next deploy.

| File | What it should be |
|---|---|
| `hero.jpg` | Temple shikhar at dawn, **or** your living room with a real family in it. Landscape, ideally 1600px+ wide. |
| `host.jpg` | The owner at the property entrance, daylight, looking at camera. Portrait orientation. No suit, no studio backdrop. |
| `bathroom.jpg` | The bathroom with the lights on. **The single most important photo on the page.** |
| `kitchen.jpg` | The induction hob and the filtered water — exactly what's provided, nothing more. |
| `utilities.jpg` | The overhead water tank and the inverter, together if possible. |
| `entrance.jpg` | The apartment's own door, with its lock. |
| `exterior.jpg` | The building from the road, with signage visible. |
| `car.jpg` | The actual car, with the actual driver. |
| `landmark1.jpg` | **Baba Baidyanath Dham itself** — the shikhar, from the approach your guest will walk. |
| `landmark2.jpg` | Your second Distances landmark, from the street. |
| `landmark3.jpg` | Your third Distances landmark. For a station, the entrance with its name board. |

### The three landmark photos need saying twice

These sit on the "Where you'll be" tiles and they are the **only** photos here
that name a specific, identifiable, real place. That makes a convincing stock
photo worse than no photo at all: the current `landmark1.jpg` is a South Indian
gopuram, which is architecturally nothing like Baidyanath Dham, and a pilgrim
who knows the temple will spot it instantly while one who doesn't is simply
misled about where they are going.

You live minutes from all three. Shoot them yourself. Until you do, either leave
the badge on or set `path: null` in `lib/landing-config.ts` — the tile then falls
back to type on a plain surface, which claims nothing.

The photo slots are **positional**, matched to the order of the property's
Distances rows: `landmark1` is the first row. Reorder those rows and the photos
stay where they are, so re-check the pairing after editing distances.

## After you replace them

Open `lib/landing-config.ts` and set `placeholder: false` on each image you've
replaced. That removes the amber "Sample photo" badge from it.

While `placeholder: true`, every one of these renders with a visible badge —
deliberately, so a stock photo can never quietly end up on a live page that
argues *"we photograph the parts other listings don't."* Shipping a stranger's
bathroom under that heading would undo the entire point of the page.

## Photography brief

Daylight only. No filters that alter wall colour. No wide-angle distortion. No
stock imagery. **Never publish a photo more flattering than the room actually
is** — the whole promise here is that what you see is what you get.

Shoot in this order of importance: bathroom → kitchen counter → living room
with people in it → made bedroom → entrance and lock → exterior with signage →
car with driver → water tank and inverter.

## About the current files

These are Unsplash placeholders, downloaded so the layout can be judged with
real photographs in place. They are **not** pictures of your property or of the
landmarks they sit under, and several are only loosely on-topic. Replace all
eleven before launch.

Note also that `lib/landing.ts` sizes the property-card photos from
`FIXED_IMAGE_COUNT`, currently **11**, against a 16-image page budget. Adding
another photo to a fixed section means raising that number too, or the page
quietly goes over budget.
