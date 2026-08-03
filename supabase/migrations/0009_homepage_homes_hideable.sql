-- The "homes" section shipped with can_hide = false because the hero's
-- primary CTA scrolls to #homes. The owner asked for every homepage section
-- to be hideable from the admin, so this lifts that lock — hiding "homes"
-- just leaves that anchor link with no target, the same as hiding any other
-- section a fragment link points at.
update public.homepage_sections
set can_hide = true
where key = 'homes' and kind = 'builtin';
