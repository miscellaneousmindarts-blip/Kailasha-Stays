import { Video } from "lucide-react";

import { ConfiguredImage, Eyebrow, Section } from "@/components/landing/primitives";
import { PhoneLink, WhatsAppLink } from "@/components/landing/actions";
import { landingConfig } from "@/lib/landing-config";

/**
 * The video-call offer is the highest-leverage trust device available here
 * and it costs nothing — it turns an anonymous online transaction into a
 * face-to-face one. Three short paragraphs, because short reads as sincere
 * and long reads as marketing.
 */
export function MeetHost({
  videoCallHref,
  phone,
}: {
  videoCallHref: string | null;
  phone: string | null;
}) {
  const { host, images } = landingConfig;
  if (!host.name) return null;

  return (
    <Section>
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
        <ConfiguredImage
          image={images.host}
          aspect="aspect-[4/5]"
          sizes="(max-width: 1024px) 100vw, 380px"
          className="rounded-lg"
        />

        <div>
          <Eyebrow hi="आपका मेज़बान" en="Your host" />
          <h2 className="mt-3 text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
            Namaste, I&apos;m {host.name}.
          </h2>

          <div className="mt-4 space-y-3 leading-relaxed">
            <p>
              I live in Deoghar.
              {host.yearsInDeoghar
                ? ` My family has been here ${host.yearsInDeoghar} years.`
                : ""}
            </p>
            <p>
              When my own relatives come for darshan, they stay in these flats.
              That is exactly why I keep them the way I do.
            </p>
            <p>
              If anything is wrong, at any hour, you call me directly. Not a
              front desk. Me.
            </p>
          </div>

          <div className="bg-primary-tint mt-6 rounded-md p-4">
            <p className="flex items-start gap-2 text-sm">
              <Video className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">
                  Want to see a flat before you decide?
                </strong>{" "}
                Ask me for a video call on WhatsApp. I&apos;ll walk you through
                the whole apartment, live — the bathroom, the kitchen, the water
                tank, everything. No booking needed.
              </span>
            </p>
            {videoCallHref ? (
              <WhatsAppLink
                href={videoCallHref}
                context="lp-videocall"
                className="mt-3 bg-surface"
              >
                Ask for a video walkthrough
              </WhatsAppLink>
            ) : null}
          </div>

          {phone ? (
            <div className="mt-4">
              <PhoneLink phone={phone} context="lp-host" />
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
