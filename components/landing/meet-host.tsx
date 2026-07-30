import { Video } from "lucide-react";

import { Eyebrow, Photo, Section } from "@/components/landing/primitives";
import { PhoneLink, WhatsAppLink } from "@/components/landing/actions";
import type { ResolvedMeetHost } from "@/lib/homepage";

/**
 * The video-call offer is the highest-leverage trust device available here
 * and it costs nothing — it turns an anonymous online transaction into a
 * face-to-face one. Three short paragraphs, because short reads as sincere
 * and long reads as marketing.
 *
 * The whole section is hidden until a host name is set — resolveMeetHost() in
 * lib/homepage.ts already applies that gate, so `resolved === null` is the
 * only case this component needs to handle.
 */
export function MeetHost({
  videoCallHref,
  phone,
  resolved,
}: {
  videoCallHref: string | null;
  phone: string | null;
  resolved: ResolvedMeetHost | null;
}) {
  if (!resolved) return null;

  return (
    <Section>
      <div className="grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
        <Photo
          image={resolved.image}
          brief="The owner at the property entrance, daylight, looking at camera"
          aspect="aspect-[4/5]"
          sizes="(max-width: 1024px) 100vw, 380px"
          className="rounded-lg"
        />

        <div>
          <Eyebrow hi={resolved.eyebrowHi} en={resolved.eyebrow} />
          <h2 className="mt-3 text-[23px] font-semibold tracking-[-0.015em] md:text-[32px]">
            {resolved.heading}
          </h2>

          <div className="mt-4 space-y-3 leading-relaxed">
            {resolved.bodyParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {resolved.videoCallTitle || resolved.videoCallBody ? (
            <div className="bg-primary-tint mt-6 rounded-md p-4">
              <p className="flex items-start gap-2 text-sm">
                <Video className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span>
                  {resolved.videoCallTitle ? (
                    <strong className="font-semibold">{resolved.videoCallTitle}</strong>
                  ) : null}{" "}
                  {resolved.videoCallBody}
                </span>
              </p>
              {videoCallHref ? (
                <WhatsAppLink
                  href={videoCallHref}
                  context="lp-videocall"
                  className="mt-3 bg-surface"
                >
                  {resolved.videoCallCta || "Ask for a video walkthrough"}
                </WhatsAppLink>
              ) : null}
            </div>
          ) : null}

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
