/**
 * The platform apex — deliberately thin (phase C4, kept simple on purpose).
 * One page: what this is, in plain terms. No signup flow yet; onboarding is
 * still superadmin-invite-only (phase B7), so there is nothing for a visitor
 * here to actually do besides read and, eventually, get in touch.
 */
export default function PlatformLandingPage() {
  return (
    <main className="flex flex-1 items-center">
      <div className="container-page max-w-2xl py-24 text-center">
        <p className="text-primary text-sm font-semibold tracking-[0.08em] uppercase">
          Deoghar BnB
        </p>
        <h1 className="font-display mt-3 text-[32px] leading-[1.15] font-semibold md:text-[44px]">
          Direct-booking websites for homestay owners
        </h1>
        <p className="text-text-muted mt-5 text-lg leading-relaxed">
          We build and host a dedicated booking site for your property — your
          own listings, your own branding, guests booking with you directly.
        </p>
        <p className="text-text-muted mt-8 text-sm">
          Currently onboarding a limited number of homestays near Baba
          Baidyanath Dham, Deoghar, by invitation.
        </p>
      </div>
    </main>
  );
}
