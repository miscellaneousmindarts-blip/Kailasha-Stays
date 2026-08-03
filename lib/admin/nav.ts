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

/** What the public site shows. Edited occasionally, not daily. */
export const WEBSITE: NavItem[] = [
  { href: "/admin/homepage", label: "Homepage", icon: Palette, hint: "Sections, photos and copy" },
  { href: "/admin/listings", label: "Listings", icon: Home, hint: "Your properties and their pages" },
];

/** Set up once, revisited rarely. */
export const BUSINESS: NavItem[] = [
  { href: "/admin/addons", label: "Add-ons", icon: Sparkles, hint: "Extras guests can book" },
  { href: "/admin/settings", label: "Settings", icon: Settings, hint: "Contact details and booking policy" },
];

export const NAV_GROUPS: NavGroup[] = [
  { label: "Operations", items: OPERATIONS },
  { label: "Website", items: WEBSITE },
  { label: "Business", items: BUSINESS },
];

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
export const MORE_GROUPS: NavGroup[] = [
  { label: "Website", items: WEBSITE },
  { label: "Business", items: BUSINESS },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/**
 * True when the current route lives behind the More tab, so that tab can
 * show as active while you're deep inside Homepage or Settings.
 */
export function isMoreRoute(pathname: string): boolean {
  return (
    pathname.startsWith(MORE_ITEM.href) ||
    [...WEBSITE, ...BUSINESS].some((item) => isActive(pathname, item.href))
  );
}
