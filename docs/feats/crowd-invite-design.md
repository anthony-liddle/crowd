# Crowd — Crowds Design Pass: Visual Specifications

Mockup-equivalent description of what the four designs should look like. Use this as a reference when reviewing what Claude Code produces.

---

## Design 1: Populated Crowds list (light mode)

**Screen layout, top to bottom:**

- **Status bar** (8:42, signal/wifi/battery icons in ink)
- **Title "Crowds"** in Libre Baskerville at 56pt, ink color, left-aligned at 50px from edge
- **Action buttons row** (50px below title): two buttons side by side
  - Left: ember-filled "Start a crowd" button (290px wide, 80px tall, 12px radius, ember background `#B85A2C`, paper text)
  - Right: ember-outlined "Join with a code" button (same dimensions, transparent background, ember 1.5px border, ink text)
- **Section header "Expiring soon"** in Libre Baskerville italic, 24pt, ink color, 60px below action buttons
- **Expiring crowd card:**
  - 600px wide, 155px tall, 14px radius
  - Paper background (`#F5F0E4`)
  - 1.5px ember border at 95% opacity (subtle warning treatment)
  - Title "Backyard Sessions" in Libre Baskerville 24pt at top-left of card with 25px padding
  - "Open" badge to the right of title: 65×26px pill, ember 1.2px outline, ember text
  - "Expiring soon" badge to right of Open badge: 115×26px pill, ember 12% opacity background, ember text
  - Meta row below title: "7 members" in dust (`#6B6660`), bullet separator, "42m left" in **ember color** (warning), then "· Started by you" in dust-2 italic
  - Two outline buttons at bottom: "Invite" and "Leave", 265×40px each, side by side with 20px gap, dust-light border
- **Section header "Active"** in Libre Baskerville italic, 24pt, 65px below the expiring card
- **Active crowd card 1 (private, owned):**
  - Same dimensions as expiring card
  - **Slightly tinted background** (`#F0E9D9` — the cream-darker tone that subtly distinguishes owned crowds)
  - Standard dust-light border (no ember warning)
  - Title "Block Party"
  - **Private badge:** 80×26px pill with dust-2 1.2px outline, dust-2 text "Private", small lock icon to the left of the text
  - Meta: "12 members · 8h 14m left · Started by you"
  - Same Invite/Leave button row at bottom
- **Active crowd card 2 (open, joined):**
  - Same dimensions
  - Standard paper background (no tint, signaling "joined not owned")
  - Standard dust-light border
  - Title "Coffee Shop Talk"
  - "Open" badge (ember outline)
  - Meta: "23 members · 19h 32m left" — no "Started by you" tag
  - Standard Invite/Leave buttons
- **Tab bar** at bottom: thin divider line, then Feed/Post/Crowds tabs (Crowds active, ink color and weight 600; Feed and Post in dust)

**Key visual decisions:**

1. The expiring crowd has *three* visual cues for urgency: ember card border, "Expiring soon" tag, and ember-colored time text. This is intentional redundancy because urgency matters; you want the eye to land on it without effort.
2. Owned crowds have a subtle background tint (`#F0E9D9`) — about 10% darker than paper. The eye picks it up but doesn't read it as "different category."
3. "Started by you" italic tag is the textual signal of ownership; the background tint is the visual signal. Either alone is enough; together they're unambiguous.

---

## Design 1: Populated Crowds list (dark mode)

Same layout, with these specific dark-mode mappings:

- Background: ink (`#1A1814`)
- Text: paper for headings, dust-d (`#8A857C`) for meta
- Card backgrounds: standard cards on ink, owned cards on slightly-lighter ink (`#221E18`)
- Card borders: very dark dust (`#2A2620`)
- Ember stays ember (`#B85A2C`) — it works on both light and dark
- The "Expiring soon" tag background is ember at 18% opacity (slightly more visible against dark)
- Lock icon and "Private" text in dust-d on dark
- Tab bar dividers in dust-darker

Owned crowd background distinction is harder in dark mode because both ink and ink-lighter are very close. The "Started by you" italic tag does most of the ownership signaling here; the background tint is barely-visible flavor.

---

## Design 2: Start a crowd modal

**Bottom-sheet modal slides up over a dimmed/blurred Crowds screen.**

- Modal extends from bottom to about 60% of screen height
- Top corners radius 24px, paper background
- Drag handle at very top (small horizontal bar, 50×4px, dust color, centered)
- **Header "Start a crowd"** in Libre Baskerville 32pt, ink color, 24px from top after drag handle
- **Subtitle line** in dust color, 16pt, normal weight: "A crowd is a small trusted group. Members can post and read in your shared space until it expires." (Two lines on phone width.) Below header with 12px gap.
- **40px gap**
- **"Crowd name" label** in 13pt dust, all-caps optional or just normal-weight. Above input.
- **Text input** for crowd name: full-width minus 40px padding, 56px tall, 8px radius, paper background slightly darker than modal background, 1px dust-light border. Placeholder "Name your crowd" in dust color.
- **24px gap**
- **Open crowd toggle row:**
  - "Open crowd" label in ink, weight 500
  - **iOS-style toggle** on the right (ember when on, dust when off)
  - **Below the label**, in dust: contextual text that changes:
    - When on: "Anyone with the code can join."
    - When off: "People can only join in person, with QR or NFC."
- **40px gap**
- **Button row at bottom:**
  - Cancel button on left: full-width-minus-padding ÷ 2, ember-outlined
  - Create button on right: same dimensions, ember-filled
  - 16px gap between them
- **Bottom safe-area padding**

**Visual flow:** the user's eye moves down through Title → Subtitle (sets context) → Name (the action) → Open/Private (the meaningful choice) → Buttons. Clean linear progression.

---

## Design 3: Join a crowd modal

**Bottom-sheet modal, same shape as Start a crowd modal.**

- Drag handle, header "Join a crowd" in Libre Baskerville 32pt
- No subtitle (the action is self-explanatory)
- **"Invite code" label** in dust 13pt
- **Text input** "Paste invite code or link", same styling as Start modal's name input
- **24px gap**
- **Centered separator:** thin horizontal line on each side, with text "Or join in person" centered between them, in dust 13pt italic
- **24px gap**
- **Two equal-sized buttons side by side:**
  - "Scan QR" with QR-code icon to the left of text
  - "Tap NFC" with NFC-tap icon to the left of text
  - Both ember-outlined, full-width-minus-padding ÷ 2 each
- **40px gap**
- **Button row at bottom:** Cancel (ember-outlined) and Join (ember-filled, **disabled when no input**).

**Disabled state for Join:** ember at 50% opacity, no shadow, no tap response.

---

## Design 4a: Scan QR flow (full-screen takeover)

When user taps "Scan QR" from Join modal:

**Layout:**

- Full-screen, ink-d background
- Status bar at top
- **Header "Scan a Crowd code"** in Libre Baskerville 28pt, paper color, 24px from top
- **Subtitle** in dust-d: "Point your camera at the QR code shared by another member."
- **Camera viewfinder area** taking about 65% of screen height in the middle:
  - Live camera feed
  - **Square cutout** centered (about 280×280 on phone), with the camera feed visible inside
  - **Outside the cutout: dimmed overlay** at about 70% opacity (so the user's eye is drawn to the square)
  - **Corner indicators** on the square (the four "[" "]" L-shapes that visually frame a QR scanner), in ember color, 4px stroke
- **Bottom area:** Cancel button (ember-outlined) centered, full-width-minus-large-padding

**Permission states:**

1. **Permission granted:** scanner shows immediately as described.
2. **Permission undetermined (first time):** before showing scanner, show a paper-card explaining "Camera access lets you scan QR codes" with a "Continue" button that triggers iOS's permission dialog.
3. **Permission denied (hard):** screen replaces scanner with: a paper-card centered, with text "Crowd needs camera access to scan QR codes" and a button "Open Settings" (ember-filled) that opens iOS settings.

**On successful scan:**

- Brief haptic feedback
- Transition to a confirmation overlay (slides up from bottom):
  - Paper-card with rounded corners
  - Header "Join Crowd?" in Libre Baskerville
  - Crowd metadata: name, "12 members · Open · 8h left"
  - Two buttons: "Cancel" (ember-outlined) and "Join" (ember-filled)
- Confirming the join: success toast, return to Crowds screen with the new crowd visible in the list.

**On invalid scan (not a Crowd code):**

- Toast at top: "That doesn't look like a Crowd code. Try again."
- Scanner stays active, user can try another code.

---

## Design 4b: Tap NFC flow (modal)

When user taps "Tap NFC" from Join modal:

**Layout:**

- Bottom-sheet modal, similar dimensions to Join a crowd modal
- Drag handle, header "Hold your phone near another phone" in Libre Baskerville 28pt
- Subtitle: "Both phones need NFC enabled and the Crowd app open."
- **Center area: animated NFC indicator**
  - Large icon (about 120×120) showing two phones tapping together
  - Subtle pulsing animation around it (ember-colored ring expanding outward and fading, repeating every 1.5s)
- **Status text below the icon:** "Waiting for tap..." in dust-d
- **Cancel button** at bottom (ember-outlined)

**On successful NFC read:** same confirmation overlay flow as QR success.

**On invalid read:** same toast as QR invalid.

**NFC unavailable:**

- If device has no NFC capability (older iPhones, iPads): the "Tap NFC" button is greyed out in the Join modal, with a tooltip when tapped: "NFC isn't available on this device."
- If NFC is disabled in Control Center: show screen explaining "Enable NFC in Control Center" with iOS-style step instructions.

---

## Common visual tokens used throughout

**Colors (light mode):**
- Paper: `#F5F0E4` (cream background)
- Paper-darker: `#F0E9D9` (subtle owned-crowd background tint)
- Ink: `#1A1814` (primary text)
- Dust: `#6B6660` (secondary text)
- Dust-light: `#D8CFB8` (borders)
- Dust-2: `#A09B91` (in-app dashed-ring color, used in subtitles)
- Ember: `#B85A2C` (accent, primary buttons, badges)
- Ember-warn: `#C73E1D` (acute warning state, < 5 min)

**Colors (dark mode):**
- Background ink: `#1A1814`
- Card-darker: `#221E18` (subtle owned-crowd distinction)
- Border-d: `#2A2620`
- Text-paper: `#F5F0E4`
- Text-dust-d: `#8A857C`
- Text-dust-2-d: `#6B6660`
- Ember stays the same (works on both modes)

**Typography:**
- Libre Baskerville for screen titles, modal headers, card titles, section headers
- Inter for buttons, labels, body text, meta info
- Sizes: 56pt (screen title), 28-32pt (modal header), 24pt (card title), 22pt (button), 16pt (meta), 13pt (label)

**Component patterns:**
- Bottom-sheet modal: 24px top radius, drag handle, paper background, slides up over dimmed Crowds screen
- Buttons: 12px radius, ember-filled (paper text) or ember-outlined (ink text)
- Badges: pill shape (radius = half height), 1.2px outline or 12% opacity fill, 13pt label text
- Cards: 14px radius, 1px-1.5px border, internal padding 25px

**Spacing rhythm:**
- 8px base unit (icon spacing, tight gaps)
- 16px (component gaps)
- 24px (section gaps within a screen)
- 40px (between major sections)
- 60px+ (between distinct screen regions)