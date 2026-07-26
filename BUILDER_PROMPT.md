# Kickoff prompt for the builder model (Sonnet 5)

Paste everything below the line into a fresh session started in `~/bnb-website`.

---

Read PLAN.md in this directory completely before writing any code. It is the single source of truth for this project — a direct-booking website + admin CMS + guest portal for my Airbnb business. Do not redesign, rename, simplify, or add features beyond it. If the plan is ambiguous or something is impossible as written, stop and ask me instead of improvising.

Rules for the whole build:

1. **Work strictly one phase at a time**, in the order of PLAN.md §7 (Phase 0 → 7). At the end of each phase: run `npm run build` and `npm run lint` (both must pass), verify every acceptance check listed for that phase in the running app, then git commit and STOP. Report which acceptance checks you verified and how, then wait for me to say "continue" before touching the next phase. Never start a phase early "while you're at it".
2. **Stack is fixed**: Next.js 15 App Router + TypeScript (strict) + Tailwind + shadcn/ui, Supabase (Postgres, Auth, Storage, Edge Functions), deployed to Vercel. Use the Supabase JS client patterns from PLAN.md §1. Do not add other databases, ORMs, state libraries, or CSS frameworks.
3. **Security is non-negotiable**: enable RLS on every table exactly per the PLAN §2 matrix; `SUPABASE_SERVICE_ROLE_KEY` must never appear in client-side code or NEXT_PUBLIC vars; guest portal data flows only through the token RPCs; guest ID files go only in the private bucket via the Edge Function; /admin and /stay are noindex and unlinked from the public site.
4. **Block system first**: before building any property-detail UI, implement `/lib/blocks.ts` (BLOCK_TYPES registry with a zod schema per type) plus `/components/blocks/` renderers exactly as PLAN §2 specifies. All section rendering — public page, guest portal, admin preview — must go through the SectionRenderer switch. Never hardcode section markup. Unknown block types render nothing publicly and an "unsupported block" notice in admin.
5. **Design system**: follow PLAN §8 exactly — its tokens, radius/shadow scales, Figtree font, motion rules (150–250ms, transform/opacity only, skeletons not spinners, reduced-motion fallbacks), and accessibility bar. Lucide SVG icons only, never emoji. If you're unsure how something should look, §8.3 describes each page; match Airbnb's patterns.
6. **When my action is needed** (creating the Supabase project, pasting keys into .env.local, creating the admin user, adding iCal URLs, connecting Vercel), give me exact click-by-click dashboard steps and wait. Never invent placeholder credentials.
7. Initialize git in this directory on Phase 0 with a proper .gitignore (.env.local excluded) and commit at every phase boundary with message `Phase N: <summary>`.

Start now with Phase 0. First output: your understanding of the Phase 0 deliverables as a short checklist, then the Supabase setup steps you need from me.

---

# Continuation prompt (each later session)

Read PLAN.md and BUILDER_PROMPT.md fully, check `git log` to see which phases are committed, then continue with the next phase under the same rules. Confirm which phase you're starting and its acceptance checks before writing code.
