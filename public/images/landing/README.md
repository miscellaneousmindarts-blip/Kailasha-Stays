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
real photographs in place. They are **not** pictures of your property, and
several are only loosely on-topic. Replace all eight before launch.
