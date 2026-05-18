# Crowd — Crowds Creation and Join Design Pass

You're doing a design pass on the Crowds-related screens and flows. The current state is functional but generic; this work brings them up to the same Ember design quality as the Feed, Compose, and other screens that have already had design treatment.

## Scope

In scope:

1. **Populated Crowds list screen.** A real design pass on what the screen looks like with multiple crowds, including visual distinction between owned vs joined, surfacing of expiring-soon crowds, and the empty-state-to-populated transition.
2. **Start a crowd modal.** The modal that appears when tapping "Start a crowd." Needs visual identity that matches the importance of the action and communicates what a crowd actually is.
3. **Join a crowd modal.** The modal that appears when tapping "Join with a code." The three join methods (paste code, scan QR, tap NFC) need a clearer visual hierarchy.
4. **Proximity-join flows.** The "Scan QR" and "Tap NFC" buttons currently toast "coming soon." Build them as real screens with real interactions. This is the larger piece of work.
5. **Crowd type visual distinction.** Open vs Private crowds need positively distinct visual treatment, not just presence/absence of an "Open" badge.

Out of scope:

- Settings/preferences screen (separate followup).
- Post-detail screen (separate followup).
- Error/loading states beyond toast (separate followup).
- Onboarding/first-launch identity rotation UX (separate followup).
- The compose-to-crowd flow (which crowd does this post go to?). The selector exists; not redesigning.

## Working principles

These have been carried through every prior phase:

- **Verify before remediate.** The screens described above are based on screenshots from real devices; verify the actual current state of the code matches what's described.
- **Honesty over deferral.** When something surfaces, surface it.
- **Treat described state as hypothesis.** Look at the actual code, not just the description.
- **The Ember design system is the reference.** Match the typography, palette, spacing, and component patterns from existing screens (Feed, Compose, RelaySheet). Don't invent new visual language.

## Discovery first

Before changing anything, read:

- `apps/mobile/src/screens/CrowdsScreen.tsx` — the current list screen.
- `apps/mobile/src/components/CrowdCard.tsx` (or wherever the card is) — the per-crowd card component.
- `apps/mobile/src/components/CreateCrowdModal.tsx` and `apps/mobile/src/components/JoinCrowdModal.tsx` (or equivalent) — the two modals.
- `apps/mobile/src/screens/EmptyCrowdsState.tsx` (or wherever the empty state lives) — for visual continuity reference.
- `apps/mobile/src/components/RelaySheet.tsx` — the existing bottom-sheet pattern. Both Create and Join modals should follow this pattern if they don't already.
- `packages/shared/src/schemas.ts` — find the Crowd schema. Note the privacy field (open vs private) and any constraints.
- `apps/server/src/app.ts` — find the Crowd-related endpoints. Note what the server already supports for join (code? QR? NFC?).

Report:
- The current populated state's actual rendering (do you have screenshots-equivalent in the code?).
- The visual difference between owned and joined crowds in the current code (if any).
- The schema's representation of crowd type (boolean, enum, etc.).
- The server's support for the various join methods. Specifically: does the API currently accept QR-encoded data? NFC payloads? Or only invite codes?
- Any existing patterns for camera or NFC access in the codebase.

Stop and confirm the discovery findings before applying changes.

## Design 1: Populated Crowds list

The populated state should feel like a continuum from the empty state, not a different screen. Specifically:

**Visual hierarchy.** Crowds should be visually grouped, not just listed. Suggested grouping:
- **Active crowds** (your crowds, sorted by most recent activity or most recently joined)
- **Expiring soon** (any crowd with less than 2 hours left, surfaced separately at the top)
- The two groups visually distinct: section headers in Libre Baskerville (matching screen title style), with appropriate spacing.

**Owned vs joined distinction.** Crowds you started should look subtly different from ones you joined. Suggestions:
- A small "Started by you" tag on owned crowds (in dust-2 color, smaller than the Open/Private badge).
- Or: owned crowds have a subtle paper-cream-darker background; joined crowds have the standard paper background.
- Don't make this loud; the distinction should be present but not dominant.

**Expiring-soon treatment.** When a crowd has less than 2 hours left:
- The "23h 59m left" text becomes "1h 12m left" in ember color (warning).
- Below 30 minutes: text color shifts to ember-warn (the existing red-tinted ember from the design system).
- A small "Expiring soon" tag appears near the crowd name.
- The card border subtly tints toward ember (so the eye can scan and immediately see which crowds need attention).

**Empty state to populated transition.** The empty state's Concentric diagram should disappear once there's at least one crowd; the screen header (Crowds) and the action buttons (Start, Join) stay. The first crowd card appears below the action buttons with appropriate spacing.

**Crowd type visual distinction.**
- **Open crowd**: ember-stroked badge labeled "Open" (current state). Add a small horizontal-line icon (≡ or similar) suggesting "anyone can join."
- **Private crowd**: a positively distinct badge, not just absence of Open. Suggested: dust-2-stroked badge labeled "Private" with a small lock icon. Same visual weight as "Open" but different shape and color so the contrast is unambiguous.

## Design 2: Start a crowd modal

The current state is functional but anonymous. The modal needs visual identity that matches the importance of the action.

**Header.** "Start a crowd" should be in Libre Baskerville (matching the Feed/Crowds screen titles), not the current sans-serif. This signals "this is a meaningful action," not a generic form.

**A short subtitle.** Currently the modal jumps straight to the name field. Add one line of context, in dust-2 color, that explains what a crowd is at the moment of creating one. Suggested copy: "A crowd is a small trusted group. Members can post and read in your shared space until it expires." Keep it short; the user is here to take action, not read documentation.

**The Open crowd toggle.** The current binary toggle is fine but the explanation is buried. Surface it more clearly:
- Toggle on (default Open): "Anyone with the code can join."
- Toggle off (Private): "People can only join in person, with QR or NFC."
- The two states should swap the explanation text in real time. This is small but it makes the toggle feel like a real choice, not a yes/no.

**Visual treatment of the modal itself.** Should match the bottom-sheet pattern from RelaySheet: rounded-top corners, paper background (slightly darker than screen background to create layering), drag handle at top.

**The Create button.** Should be the ember-filled button (matching "Post" on compose). The Cancel button should be the ember-outlined button (matching the secondary patterns).

## Design 3: Join a crowd modal

The current modal has three join methods (paste, QR, NFC) but their hierarchy is muddy.

**Header in Libre Baskerville**, same treatment as Start a crowd.

**Hierarchy of join methods.** The three methods are not equivalent; they serve different scenarios:

- **Paste invite code**: the most common case, when someone shared a link or code with you. Should be the primary surface.
- **Scan QR**: when you're physically near someone showing a QR code. Should be visible but secondary.
- **Tap NFC**: when you're physically near someone with NFC-enabled phones. Same hierarchy as QR.

Suggested layout:
- Large input field at top: "Paste invite code or link" (current pattern, fine).
- Below the input, a separator with the text "Or join in person" centered.
- Below that, two equal-sized buttons side by side: "Scan QR" and "Tap NFC." Both with their respective icons.
- The separator text "Or join in person" frames the alternatives correctly: not "other ways" but "for when you're physically together."

**The Join button at the bottom.** Should remain ember-filled and ember-outlined for cancel.

**Disabled state for the Join button.** Currently it appears active even when the input is empty. Disable until the input has text OR until a QR/NFC join has been completed.

## Design 4: Proximity-join flows (the larger piece)

This is the new work. Both Scan QR and Tap NFC need real screens.

### Scan QR flow

When user taps "Scan QR":
1. Modal slides up (or full-screen takeover, your call based on what feels right) with a camera viewfinder.
2. Visual treatment: camera feed in the center, framed by a square viewfinder cutout. Outside the cutout is dimmed (the standard QR-scanning UX).
3. Header: "Scan a Crowd code" in Libre Baskerville.
4. Subtitle: "Point your camera at the QR code shared by another member."
5. Cancel button at the bottom (ember-outlined).
6. On successful scan: validate the code matches the Crowd schema. If valid, transition to a confirmation: "Join [Crowd Name]?" with the crowd's metadata (member count, time left, type). User confirms → crowd is joined → return to Crowds screen with the new crowd visible.
7. On invalid scan: show a brief toast "That doesn't look like a Crowd code" and return to scanning.

**Camera permission handling.**
- If permission is granted: scanner appears immediately.
- If permission is undetermined: request it with a clear in-app prompt before showing the system dialog.
- If permission is denied (hard): show a screen explaining "Camera access is needed to scan QR codes" with a button to open Settings.

### Tap NFC flow

When user taps "Tap NFC":
1. Modal slides up with a clear visual instruction: an animated icon showing an NFC tap motion (the existing NFC iconography from iOS, or a custom animation).
2. Header: "Hold your phone near another phone" in Libre Baskerville.
3. Subtitle: "Both phones need NFC enabled."
4. Cancel button at the bottom.
5. On successful read: same confirmation flow as QR (show crowd metadata, confirm to join).
6. On invalid read: same "doesn't look like a Crowd code" toast, return to NFC reading.

**NFC availability handling.**
- If the device doesn't have NFC (older iPhones, iPads): the "Tap NFC" button should be disabled or hidden in the join modal entirely, with a tooltip "NFC not available on this device."
- If NFC is available but disabled: show a screen with "Enable NFC in Control Center" with instructions.

### What does the QR code / NFC payload encode?

The payload should be a URL-shaped invite code that the app can recognize and parse. Suggested format:
```
crowd://join?code=<invite-code>&name=<url-encoded-name>&type=<open|private>
```

The `name` and `type` fields are advisory (so we can show them in the confirmation screen before the user joins); the server is the source of truth and validates them.

If the server doesn't currently produce shareable codes in this format, that's a small server-side addition: add a `/crowds/:id/share-code` endpoint that returns the URL plus QR-code-renderable data. This is a real piece of work but small (probably 30-45 minutes).

### Generating QR codes (for sharing)

Out of scope for *receiving* QR codes (that's Design 4), but worth flagging: the existing "Invite" button on a crowd card needs to generate a shareable QR code. This is a separate followup, not part of this pass.

## Verification

After all designs are implemented:

1. **Populated state.** Manually create 5+ crowds (or seed them). Verify:
   - Owned and joined are visually distinct.
   - Expiring-soon crowds surface at the top with appropriate warning treatment.
   - The "23h 59m" → "5m 23s" transition through ember warnings reads cleanly.
   - Public vs Private crowds have unambiguous visual difference.

2. **Create modal.** Open it. Verify:
   - Header is Libre Baskerville.
   - The toggle's explanation swaps based on state.
   - Buttons match Ember conventions (ember-filled primary, ember-outlined secondary).

3. **Join modal.** Open it. Verify:
   - Three join methods have clear hierarchy.
   - The "Or join in person" separator reads correctly.
   - Disabled-button state for the Join CTA when no input.

4. **QR flow.** Tap Scan QR. Verify:
   - Camera permission flow handles all three states (granted, undetermined, denied).
   - Scanner shows correct viewfinder UI.
   - Valid code → confirmation → join works end-to-end.
   - Invalid code → toast → return to scanning.

5. **NFC flow.** Same shape as QR verification.

6. **Existing tests.** `pnpm -r typecheck`, `pnpm --filter @app/mobile test`, `pnpm --filter @app/server test` should all still pass.

Report verification observations including screenshots if helpful.

## Things to deliberately not do

- Don't add new dependencies for camera or NFC unless the existing stack doesn't support them. Check Expo's built-in modules first (`expo-camera`, `expo-barcode-scanner`, `expo-nfc-reader` if it exists; otherwise React Native's NFC modules).
- Don't redesign the FeedScreen, ComposeScreen, or any other screen outside Crowds.
- Don't add tests for the new flows. We'll add them as part of the future React Native component testing setup.
- Don't change the underlying Crowds API beyond the small `share-code` endpoint addition (and only if needed for the QR payload).
- Don't add a "join history" or "expired crowds" view. Out of scope.
- Don't change the timing/expiration logic. The 24h default and the existing expiration semantics stay.

If you find yourself wanting to do any of these, surface as a question.

## Stop

When all four designs are implemented and verified, produce a report:
- Files changed/added, grouped by design (1-4).
- Before/after screenshots if you can capture them (or describe the visual change in detail).
- Any new dependencies added.
- Any new server endpoints added (for QR payload generation).
- Things noticed but not fixed.
- Specific copy decisions you made (modal subtitles, error messages) for me to tune.

Then stop. Done.