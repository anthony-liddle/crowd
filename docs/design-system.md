# Ember

The design system for Crowd. Named for the color that runs through everything.

## What Ember is for

Crowd is an app about ephemerality, locality, and trust. The visual language should feel like those things. Ember tries to feel handmade rather than templated, warm rather than corporate, and quiet rather than attention-grabbing. The platform's whole shape comes from respecting attention rather than competing for it; the design language has to match.

The system is small on purpose. There's a constrained color palette, two typefaces, a semantic type-size ramp, and a handful of spatial primitives. If a new design surface needs something outside the system, the right question is usually "can this be solved with what's already here?" before "should we add something?"

## Where it lives

The tokens live in `apps/mobile/tailwind.config.js`. NativeWind extends Tailwind's color, typography, spacing, and radius scales with Ember-specific values. Components consume them via Tailwind class names in most cases, and via component-local color maps where raw hex values are needed (SVG fills and strokes, modal backdrops, anywhere a class name can't reach).

The token file itself contains comments explaining the rationale behind specific values — what `paper-tint` is for, why `ember-warn` is distinct from `warn`, what `on-ember` exists to solve. Those comments are load-bearing. Read them before changing or adding tokens.

The unrouted screen `apps/mobile/src/screens/_DesignTest.tsx` is a component gallery — Ring at three states, Concentric, ReachPreview, both button variants, RelayControl and RelaySheet — with captions explaining what each demonstrates. It's the reference rendering for how Ember components look in isolation.

## Colors

### Light mode

Three primaries do most of the work:

- **paper** `#F5F0E4` — the background. Warm off-white, not bright. Reads as page or card stock, not screen.
- **ink** `#1A1814` — the primary text and structural color. Near-black with warmth, not pure black.
- **ember** `#B85A2C` — the accent. Draws the eye when it appears. Used for primary actions, active states, decay indicators (rings counting down), and the one or two elements per screen that need to be the focal point.

Supporting tokens, all defined in the same place:

- **paper-2** `#EFE9DA` — card and sheet surface for joined crowds and modal panels. One step lifted from the base paper.
- **paper-tint** `#F0E9D9` — owned-crowd card background. Distinct enough for the eye to pick up, quiet enough not to read as a separate category.
- **ink-2** `#3A3631` — body copy on sheets, slightly softer than ink.
- **dust** `#6B6862` — secondary metadata text (distances, ages, counts).
- **dust-2** `#A09B91` — tertiary text and badge borders.
- **rule** `#E0DAC9` — all standard borders, separators, and the unfilled track of the Ring.
- **on-ember** `#FFF7EE` — text drawn on ember backgrounds, since paper-on-ember can lose contrast at small sizes.
- **ember-warn** `#C73E1D` — Ring stroke and badge text when something has under five minutes remaining. Distinct from warn (below) because expiration isn't destructive.
- **warn** `#B23A48` — reserved for destructive actions. Contrast constraint worth pinning: the canonical use, the Leave button's warn label on a `paper-2` card surface, sits at 4.83:1 against that background, just above the WCAG AA 4.5:1 threshold for normal text. That pair is the system's tightest text-contrast margin and the first that would slip below AA if `warn` were darkened or the paper tiers (`paper-2`, `paper-tint`) were lightened. Re-check whenever either token shifts.

The relationships matter: paper → paper-2 → paper-tint forms a three-tier lift, each step subtle enough that two adjacent cards on different tiers read as "related but distinguished." This three-tier system is the depth model; the system has no shadows.

### Dark mode

Dark mode is not a literal inversion. Each token has a deliberate dark-mode counterpart suffixed with `-d`:

- **paper-d** `#14130F` — lifted near-black, warm. Mirrors paper's warmth rather than going to pure black, which would feel cold.
- **paper-2-d** `#1B1A15` — one step lifted above paper-d.
- **paper-tint-d** `#221E18` — two steps lifted. Preserves the three-tier relationship in dark mode.
- **ink-d** `#EDE7D9` — warm off-white, not pure white.
- **ink-2-d** `#C9C2B2`
- **ember-d** `#D08454` — shifted, not the same hex as light ember. Lightened and slightly desaturated so it reads at the same perceptual weight on a dark background.
- **on-ember-d** `#1A1814` — note that this equals light-mode ink. Ember buttons in dark mode get dark text on the (still-orange but lighter) ember surface.
- **ember-warn-d** `#E45F45` — brightened to maintain warning weight against dark backgrounds.
- **warn-d** `#D87078` — same logic.
- **rule-d** `#2A2724`
- **dust-d** `#8A8579`
- **dust-2-d** `#5A554B`

The deliberate non-inversions matter. Pure inversion would produce a dark mode that felt mechanically derived. Each token pair is tuned for its mode.

### How appearance is detected and applied

NativeWind's `darkMode: 'class'` strategy is enabled. `App.tsx` reads `useColorScheme()` and applies a literal `dark` class on a wrapping `<View>`; NativeWind keys off that class to apply dark variants throughout the tree. Components use Tailwind variants like `text-ink dark:text-ink-d` to switch.

There's no theme provider, no Context, no user-facing override. The app follows iOS's system appearance setting. If a user-controllable theme toggle is ever needed, this is the system to extend.

For components that need raw hex values (SVG fills and strokes, modal backdrops), the same `useColorScheme()` is read and a component-local `COLORS = { light, dark }` map is picked. There is currently no shared `useThemeColors()` helper; each SVG component declares its own map.

## Typography

Two faces, both serving specific roles:

- **Libre Baskerville** (serif) — used where reading feel matters. Headings on certain surfaces, the Concentric Ring's countdown numerals, content text where the system wants to communicate "this is something to read, not a control."
- **Inter** (sans-serif) — used for UI text. Buttons, labels, metadata, status indicators, anywhere the text is functional.

Loaded via Expo's `useFonts` from the `@expo-google-fonts` packages. The app renders a `<Splash />` until fonts have loaded.

The weight set is constrained:

- Libre Baskerville: 400 regular, 400 italic
- Inter: 400 regular, 500 medium, 600 semibold

Mapped to Tailwind classes: `font-serif`, `font-serif-italic`, `font-sans`, `font-sans-medium`, `font-sans-semibold`. Adding a new weight means adding it to `useFonts` *and* the Tailwind config — both are required.

### Type-size ramp

The ramp is named semantically rather than by t-shirt size:

- **meta** `11 / 14` — smallest metadata (timestamps, counts)
- **caption** `12 / 16` — short auxiliary text
- **body** `13 / 20` — body content in compact contexts
- **post** `16 / 23` — primary message text in the feed
- **compose** `17 / 25` — text being composed (the create-message screen input)
- **title** `24 / 26` — section titles and primary headings
- **mark** `42 / 46` — the largest mark, used sparingly

The semantic naming is intentional. `post` means "the type size used to render a post"; you pick it because you're rendering a post, not because it's "around 16px." This pushes the system toward role-driven rather than size-driven choices.

Typography is not mode-dependent. Font family, size, and line height stay the same in both light and dark mode.

## Spatial primitives

These are the components that aren't generic UI primitives — they exist because Crowd specifically needed them.

**Concentric** — the decaying ring around a post. Tracks how much of the post's lifespan remains. The post starts as a full ring and erodes over time, ember-colored, until it disappears. Concentric is Crowd's ephemerality made visible.

**Ring** — the countdown component used elsewhere. Private invite QR codes (5-minute proximity-token expiry), cold-open feed while location is fetching. Same visual language as Concentric, used for different temporal events. The stroke shifts to `ember-warn` (or `ember-warn-d`) when under five minutes remain.

**ReachPreview** — visualization of a post's spatial reach. Radius from origin, optionally with boost locations marked. Privacy-aware: shows relative-distance abstraction, never exact coordinates. The visual primitive for the platform's locality dimension.

**RelayControl / RelaySheet** — the boost mechanism's controls. Relays extend a post's spatial reach by adding the booster's location as an additional reachable point. The controls express this as "extend it from where I am," not "make this post louder."

The naming convention: each primitive is named for the abstract thing it shows ("Concentric," "Ring") or the action it controls ("RelayControl"), not the technical implementation. The names are short, unique, and greppable.

## Components in the system

Concrete components that embody Ember well, useful as references:

- **PostCard** — the canonical message render. Note: it's a row with a bottom rule, not a card. Separation from neighbors is achieved by `border-b border-rule dark:border-rule-d` plus row padding. No background, no enclosing border, no rounding.
- **CrowdCard** — a true card. Tinted background (paper-tint for owned, paper-2 for joined), full border (rule normally, ember when expiring), `rounded-md` radius. The dark-mode equivalents preserve the same three-tier lift.
- **JoinCrowdModal** — the unified Modal state machine (per PR #70). Multiple internal views share the same paper-grounded shell; state transitions happen inside one Modal rather than across many.
- **PrivateInviteSheet** — QR code on paper, ember Ring counting down, ember regenerate button. Demonstrates how ephemeral artifacts are visualized.
- **DestructiveButton** — outlined like QuietButton (same shape, same padding, same radius, same `active:opacity-60`), but `border-warn dark:border-warn-d` and `text-warn dark:text-warn-d`. No saturated fill. Establishes the project's warn-button vocabulary: the destructive signal comes from accent placement on border and label, not luminance. Reserved for actions that delete or otherwise can't be undone. First use is the Clear my data action on the You tab; `warn` is already the token the system reserves for destructive actions.
- **QuietButton with `tone="card"`** — the same outlined Quiet shape, but with `border-dust-2 dark:border-dust-2-d` instead of `border-rule dark:border-rule-d`. For QuietButton instances that sit on a tinted card surface (`paper-2` or `paper-tint`), where `rule` is too close to the card's own border to read as a separate boundary. First use is the Invite button on CrowdCard, paired with the Leave DestructiveButton: the two outlined siblings need to read as equal-weight controls, one neutral and one destructive. Default `tone` keeps the `rule` border, which is correct on `paper`-base surfaces and on modal sheets where contrast against the surrounding surface is adequate.

## Spacing and radii

Spacing is partially codified. Two named tokens exist:

- **screen-x** `22px` — horizontal screen padding (`px-screen-x`, `mx-screen-x`)
- **post-y** `16px` — vertical post-row padding (`py-post-y`)

Everything else is inlined per-component using Tailwind's default scale or literal pixel values.

Radii are standardized:

- **rounded-sm** `6px` — badges
- **rounded-md** `8px` — cards, the QR code container, most surface containers
- **rounded-lg** `12px` — larger surfaces (used sparingly)
- **rounded-full** `9999px` — bottom-sheet handles, circular elements

## Depth model

Ember has no shadows. Depth and separation are achieved by:

- **Lifted backgrounds.** The paper → paper-2 → paper-tint progression (and its dark-mode equivalent) is how surfaces appear to stack.
- **Rule borders.** Subtle 1px borders in the rule color separate adjacent surfaces. Footgun worth naming once: React Native's default border color is opaque black, not the rule token, so inline `borderTopWidth: 1` without a matching `borderTopColor` (or a `border-rule dark:border-rule-d` className on the same view) renders as a near-black hairline in both modes. Either pair the inline width with `borderColor: c.rule` from the component's `COLORS` map, or co-locate a NativeWind class on the same view. Caught once on the You screen and fixed; no other site in the codebase is affected today.

This is a deliberate property of the system. Paper doesn't cast the kind of shadow that a card-on-glass design language implies. Surfaces in Ember sit at different heights of the same warm material, separated by quiet rules.

If a future surface needs more emphasis than the three-tier lift provides, the right move is usually "use ember sparingly" rather than "add a shadow."

## What makes something Ember-shaped

When in doubt about a design decision:

- Does it feel like paper, not glass? Warm backgrounds, no shadows that imply glass-on-glass depth.
- Is the ember used to draw attention to one thing, not many? Restraint matters more than presence.
- Does the typography pair serve its role? Baskerville for reading; Inter for function.
- Is the spatial primitive doing the work of a metaphor, not just decoration? Concentric shows time eroding; it's not a styled progress bar.
- Is the component small enough that its purpose is obvious? If it's doing three things, it should probably be three components.

Things that are not Ember-shaped:

- Gradients other than very subtle paper-tint
- Saturated colors outside the existing palette
- Drop shadows or elevation effects
- Iconography that reads as techy (circuits, brackets, sparkles, AI swirls)
- Body text that mixes serif and sans within a single block
- Brightness as a way to signal importance — Ember uses placement and the accent color, not luminance

## When to extend the system

Adding to Ember should be deliberate. The bar is: "the current system can't express what this surface needs." Not "this would be slightly easier with a new component."

Before adding:

1. Try to express the need with existing primitives. Most of the time this works.
2. If you can't, check whether two existing primitives composed differently would do it.
3. If still not, the new primitive should be named for its abstract role (what it shows or does), not its implementation.
4. New tokens — colors, type sizes, radii — come last. The constrained palette is what makes the system feel coherent.

When you do add: document the addition here, and update the token comments in `tailwind.config.js` to explain the rationale. The system stays small by being deliberate about growth.

## Known drift

Honesty about what isn't quite consistent yet:

- **Component-local color maps.** Every SVG-using component re-declares the hex values it needs from its own `COLORS = { light, dark }` constant. A shared `useThemeColors()` helper would let the SVG layer track the tokens automatically. Filed as future work.
- **Modal backdrop opacities.** Two values are in use without a clear rule: `rgba(0,0,0,0.45)` (most sheets) and `rgba(0,0,0,0.55)` (the confirmation card and one path in JoinCrowdModal). Worth picking one and tokenizing.
- **Ember-soft translucent fills.** Three close-but-not-equal alphas appear across Concentric and CrowdCard for the "expiring soon" ember background. Worth tokenizing as `ember-soft` / `ember-soft-d`.
- **PrivateInviteSheet uses off-palette hex values** for the QR code's color and backgroundColor props. Could be intentional QR-contrast tuning or copy-paste drift; worth confirming and either tokenizing the deviation or aligning with the palette.
- **Inline pixel font sizes** exist in several components alongside the named ramp. Worth tightening to use the ramp tokens consistently.
- **The Leave button doesn't use the `warn` token** despite `warn` being described in the tokens file as reserved for destructive actions. Currently uses the same QuietButton style as Invite. The resolution path now exists: swap to `DestructiveButton`, which is the canonical warn-as-accent treatment. Not yet done; tracked here rather than in followups because it's a one-line component swap.
- **Two documented intentional overrides, both substituting `dust-2` for `rule`:** `rule` is the standard border token, but where a surface's color sits close enough to `rule` that the border collapses into its background, `dust-2` is the system's substitute. Concentric uses this in negative space — the unfilled Ring track would be too faint in `rule` against `paper`. `QuietButton` with `tone="card"` uses it for outlined controls on card tiers (`paper-2`, `paper-tint`), where the card's own `rule` border collides with the button's. Both deviations are explicit and commented at their call sites. The other items above are undocumented drift; if a third sanctioned `rule`→`dust-2` substitution appears, the substitution has become a settled pattern worth promoting into the `rule` token's comment rather than describing case by case here.
