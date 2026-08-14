import {
  CalendarDays,
  Home,
  Inbox,
  LayoutDashboard,
  MoreHorizontal,
  Palette,
  Receipt,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { TenantPlan } from "@/lib/types/database";

/**
 * One source of truth for admin navigation, shared by the desktop sidebar,
 * the mobile tab bar and the mobile "More" screen — so a destination can
 * never exist in one and be missing from another.
 *
 * Grouped by how often the owner actually opens each thing, which is the
 * distinction the old flat list lost: Bookings and Enquiries are checked
 * daily, the homepage copy is edited a few times a year, and Add-ons or
 * business details are set up once. A flat list implied those were peers.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown under the label on the More screen, where there's room to explain. */
  hint?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

/**
 * Day-to-day operations. These four are the mobile tab bar, in the order an
 * owner reaches for them.
 */
export const OPERATIONS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, hint: "Today at a glance" },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, hint: "Availability and platform sync" },
  { href: "/admin/bookings", label: "Bookings", icon: Receipt, hint: "Confirmed stays and payments" },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, hint: "New guest questions" },
];

/**
 * What the public site shows. Edited occasionally, not daily.
 *
 * Homepage is listed here unconditionally — navGroupsFor()/moreGroupsFor()
 * below are what actually drop it for a 'listing' (Plan A) tenant, who has
 * no homepage of their own to edit (0027, docs/tenant-plans-plan.md §5).
 * Listings stays for every plan: a listing tenant's property sections still
 * render on the apex's /stays/[slug] page, so there's still something to edit.
 */
export const WEBSITE: NavItem[] = [
  { href: "/admin/homepage", label: "Homepage", icon: Palette, hint: "Sections, photos and copy" },
  { href: "/admin/listings", label: "Listings", icon: Home, hint: "Your properties and their pages" },
];

/** Set up once, revisited rarely. */
export const BUSINESS: NavItem[] = [
  { href: "/admin/addons", label: "Add-ons", icon: Sparkles, hint: "Extras guests can book" },
  { href: "/admin/settings", label: "Settings", icon: Settings, hint: "Contact details and booking policy" },
];

/** WEBSITE with Homepage dropped for a 'listing' tenant. */
function websiteFor(plan: TenantPlan): NavItem[] {
  return plan === "listing" ? WEBSITE.filter((item) => item.href !== "/admin/homepage") : WEBSITE;
}

export function navGroupsFor(plan: TenantPlan): NavGroup[] {
  return [
    { label: "Operations", items: OPERATIONS },
    { label: "Website", items: websiteFor(plan) },
    { label: "Business", items: BUSINESS },
  ];
}

/**
 * The mobile tab bar. Capped at 5 (bottom-nav-limit) and spent entirely on
 * daily work plus one More tab — the old build put Homepage and Settings in
 * the header as two unlabelled icons, which is exactly the icon-only
 * navigation the project's own rules warn against.
 */
export const MORE_ITEM: NavItem = {
  href: "/admin/more",
  label: "More",
  icon: MoreHorizontal,
};

export const MOBILE_TABS: NavItem[] = [...OPERATIONS, MORE_ITEM];

/** Everything the More screen lists — i.e. everything not already a tab. */
export function moreGroupsFor(plan: TenantPlan): NavGroup[] {
  return [
    { label: "Website", items: websiteFor(plan) },
    { label: "Business", items: BUSINESS },
  ];
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * True when the current route lives behind the More tab, so that tab can
 * show as active while you're deep inside Homepage or Settings. Checked
 * against the full WEBSITE/BUSINESS lists regardless of plan — a 'listing'
 * tenant can't reach /admin/homepage from the nav, but the route itself
 * 404s for them anyway (see app/admin/(dashboard)/homepage/page.tsx), so
 * there's no page left for this to wrongly highlight More on.
 */
export function isMoreRoute(pathname: string): boolean {
  return (
    pathname.startsWith(MORE_ITEM.href) ||
    [...WEBSITE, ...BUSINESS].some((item) => isActive(pathname, item.href))
  );
}
