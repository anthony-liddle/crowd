# Crowd — Decisions and Project Memory

A record of how Crowd got to its current shape. Settled architectural decisions, lessons learned from work that's already shipped, and operational knowledge worth carrying forward.

This document is the historical companion to `docs/followups.md`. The followups doc is the active backlog of what's pending; this doc is the memory of what happened and why.

When something ships and the doing-it is no longer the work, the record of it moves here. The working backlog stays lean.

Last entry added: late-May 2026 (You tab and Clear my data)

---

## Working principles to keep applying

These emerged from doing the work across all phases. Worth holding onto for any future project, not just Crowd.

- **Verify before remediate.** Prompts and reports describe state; the code is the source of truth. Run the cheap commands that confirm state before acting on described state.

- **Honesty over deferral.** When drift surfaces inside a phase, fix it inside that phase. Booking it for "later" usually means it accumulates with other deferrals into a thorny pile.

- **Treat described state as hypothesis.** Whether the source is a prompt, a previous report, or your own mental model, "what's true now" needs verification. Cheap verification beats building on a wrong assumption.

- **Don't expand the testing surface inside cleanup phases.** "Fix or delete what exists" is the rule; standing up new test infrastructure is its own piece of work that deserves dedicated attention.

- **Migration filenames are part of the deploy timeline.** Rename auto-generated names to read like changelog entries. Codified in CONTRIBUTING.md.

- **The continue-on-error round-trip pattern.** When you have to land a known-broken state to enable later work, gate it explicitly with a comment naming the next phase that removes it. Future-you grepping for `continue-on-error` finds the trail.

- **Layer of testing matters.** Test behavior at the layer the contract lives, not below it. HTTP integration tests beat ORM-layer assertions because the HTTP boundary is what consumers depend on; the ORM is an implementation choice that can change.

- **Job independence over CI minutes.** A failing job's name should tell you specifically what's broken. Don't merge separate concerns into one job to save CI time; useful redundancy is worth its cost.

- **Verify the diagnosis before applying the fix.** Phase C5's "What I got wrong" surfaced this: pushing a fix without confirming it actually addresses the symptom (e.g., bundle still had unresolved require()) costs a round-trip. Cheap verification commands like grep against the built artifact would have caught the issue on iteration zero.

- **Instrument first, fix second on hard bugs.** When a hypothesis-driven fix doesn't resolve a symptom, the next move isn't another hypothesis. It's adding diagnostic logs to find ground truth. The QR scan saga went through two iterations of guessing at modal stacking before instrumentation revealed the actual mechanism (three Modals churning lifecycle events in 32ms, not two). The instrument-first iteration would have been cheaper than the two guess-first iterations combined.

- **Designs that resist simple explanation are usually unfinished.** The identity model went through four iterations before settling on "globalUserId for the global feed, crowd-specific IDs for everything Crowds, each lives only as long as its purpose does." That sentence is the test of whether the design has settled. Earlier iterations couldn't be summarized that cleanly because they had unresolved tensions.

---

## Onboarding readiness review (May 2026)

A codebase review was completed. The review applied three lenses (clean / makes sense / well-documented) and produced findings categorized by severity.

Fixed in the highest-value-hour pass:
- Root README setup section reconciled with current reality (per-app `.env.example` files, `pnpm dev:up` + `pnpm dev:seed` path, explicit `apps/mobile/.env` requirement)
- PostGIS claims removed from `apps/server/README.md`
- `apps/mobile/.env.example` default flipped to the dev backend URL so a fresh checkout works on a physical device out of the box

Subsequently completed in the deferred documentation pass:

- `docs/design-system.md` created — the Ember design system documented with light/dark tokens, type ramp, spatial primitives, depth model, and a "known drift" section
- `apps/mobile/PROJECT_STRUCTURE.md` deleted and the root README pointer removed
- `apps/mobile/README.md` rewritten with Crowd-specific content (Ember pointer, identity model pointer, deep link pointer, `.env` requirement)
- `.notes/` moved to `docs/archive/` with "snapshot, not current" headers on each file
- `docs/README.md` created as a navigation hub for the docs/ directory
- `apps/mobile/src/screens/_DesignTest.tsx` annotated with a top-of-file JSDoc explaining its purpose
- Misleading TODO in `apps/mobile/src/services/api.ts:37` reworded to accurately describe `DEFAULT_LOCATION`'s current role
- `CONTRIBUTING.md` placeholder repo URL fixed (`yourusername` → `anthony-liddle`)
- `proximity_tokens` table added to the schema section of `apps/server/README.md`

The `### Documentation accuracy` subsection under Technical follow-ups was removed after all items shipped.

---

## Crowd Feed bugs (Phase B testing surfaced, addressed in fix-pass)

Status: fixed in the post-Phase-B fix-pass. Listed here for completeness.

- Ring tick rate too coarse under 60 seconds (now adaptive: 1s/10s/30s based on min remaining time across visible posts)
- Expired posts didn't disappear until next fetch (now client-side filtered in addition to server-side)
- 5 km reach cap was UI-only; schema accepted up to 100 km (now `.max(5000)` at the schema level)
- Lifespan cap was UI-only; schema accepted up to 7 days (now `.min(5).max(720)` at the schema level)

---

## Stale-location bug (real-world testing surfaced, addressed in fix-pass)

Status: fixed in the stale-location fix-pass. Listed here for completeness.

- `useLocation` mount-time capture meant post submission used coordinates from when the screen mounted, not when the user tapped Post — could be hours stale after backgrounding. Real privacy issue (post broadcasts from where user *was*, not where they are).
- Fix: new explicit `getFreshLocation()` async method on the hook with discriminated-union return type. Submit handler awaits a fresh location with a 5-second timeout and 30-second staleness threshold. Three-state submit machine (idle / locating / submitting). 1-second-delayed "Locating..." label so fast fetches don't flicker.
- Same pattern applied to FeedScreen cold-open: skeleton + Concentric + "Finding posts near you..." while waiting; "Can't find you" retry block on failure.
- Toast for transient errors, native iOS Alert with "Open Settings" affordance for permission_denied.
- Discovered: the existing FeedScreen `loadMessages` previously called `getMessages(undefined)` when location was absent, returning data without coords. New code hard-errors instead. Aligned with the privacy reasoning.

---

## Crowds design pass (mid-May 2026)

Status: largely shipped. The design pass produced the populated Crowds list redesign, refined Create and Join modals, the QR scan flow, and the proximity-token server endpoints.

Followups specifically from this pass:

- ~~**QR generation flow on the Invite button.**~~ Shipped in the testing-blockers fix-pass. Open crowds use Share.share(); private crowds open a `PrivateInviteSheet` modal with QR + countdown + regenerate button. Both work end-to-end.
- ~~**Lookup-token endpoint for pre-join confirmation.**~~ Shipped. `POST /crowds/lookup-token` returns crowd metadata without consuming the token.
- ~~**Crowd-specific user-id rotation when joining via token.**~~ Replaced entirely by the four-iteration identity model rearchitecture (see below).
- ~~**Server tests for proximity token endpoints.**~~ Added. 7 new tests cover owner mint, non-owner reject, lookup idempotency, single-use consume, backdated-expiry reject, unknown token, malformed payload.

---

## Identity model rearchitecture (May 2026, four iterations on PR #68)

Status: settled. The final design has clean separation between globalUserId (for the global feed only, rotates with content) and crowd-specific IDs (per crowd, stable for the membership's lifetime, survive globalUserId rotation, purged on leave or expiration).

The arc:

- **Round 1 (original):** crowd-specific IDs for memberships with N+1 fetch on `getMyCrowds` and a misguided create-then-leave-rejoin sequence that broke private crowd creation entirely.
- **Round 2:** simplified to mainUserId everywhere — broke the rotation privacy property (memberships died when globalUserId rotated, which it does whenever content runs out).
- **Round 3:** restored crowd-specific IDs for memberships with a bulk-lookup endpoint, but kept ownership tied to mainUserId — meant users lost owner status on their own crowds when they rotated.
- **Round 4 (final):** clean separation. globalUserId for the global feed only. Crowd-specific IDs for ownership, membership, message authorship, getMyCrowds — everything in the Crowds domain. IDs purged on leave (immediate) and on crowd expiration (lazy, via lookup response cross-reference). Server has zero awareness of globalUserId in any Crowds endpoint.

The privacy properties that survive: rotation across globalUserId remains intact (a user's global feed activity isn't linkable across rotation). Cross-crowd unlinkability of message authorship is preserved (each crowd uses a different ID for message authoring). The privacy property that's deliberately abandoned: memberships within a single device are linkable to each other in the database via shared crowd-specific IDs over a crowd's lifetime — but that's bounded by the crowd's 24-hour lifespan, and the only place the linkage between a user's various crowd identities exists is on the device.

What worked about the iteration process: each round taught us something the previous couldn't see. Round 1 surfaced the broken rejoin pattern. Round 2 surfaced the rotation property we hadn't been protecting. Round 3 surfaced the ownership-tied-to-rotating-id problem. Round 4 settled. Designing the final shape upfront wasn't possible because the constraints weren't all visible until the work surfaced them.

---

## Testing-blockers fix-pass (May 2026)

Status: shipped. Three real bugs surfaced from initial real-device testing with a partner.

- **Keyboard covered Create modal input.** Fixed by wrapping CreateCrowdModal and JoinCrowdModal in `KeyboardAvoidingView` with iOS padding behavior.
- **Open-crowd Invite share flow.** Built `PrivateInviteSheet` for private crowds (QR code + countdown + regenerate). Open crowds use `Share.share()` with the invite link. Bug 2 from the original brief ("creator not added to private crowds") turned out to be a misread of the Invite-button-doesn't-work symptom; once Fix 3 landed, the underlying complaint resolved.
- **Parser robustness.** `parseCrowdInvite` now tolerates trailing slashes on both `crowd://join/<id>/` and the `cid` query value of token URLs. 10 new unit tests cover the variants.

---

## QR scan modal-stacking saga (PR #69 → PR #70)

Status: settled. Documented here at length because the lessons compound.

**The bug:** scanning a QR code for a private crowd bypassed the confirmation modal and froze the app on the Crowds screen. Membership never landed server-side.

**PR #69 (didn't work):** modal-stacking diagnosis with a 350ms defer between scanner dismissal and confirmation modal presentation. Reasonable hypothesis based on observable symptoms; merged after passing real-device verification on the dev's setup. Real-device testing with a partner showed the symptom persisted after merge.

**The diagnostic instrumentation pass:** added structured `[QR-SCAN]` console logs at every state transition in the scan flow. Real-device repro with the instrumented build gave a clear timeline.

**The actual mechanism:** three Modals all changed lifecycle state in 32ms. The main `JoinCrowdModal` dismissed (because confirmation took its place in the visibility expression), the scanner Modal dismissed (because the scan was complete), and the confirmation Modal tried to present. iOS dropped the third presentation. PR #69's defer protected against scanner-vs-confirmation racing but didn't address main-vs-confirmation racing because they were both triggered by the same setState call.

**PR #70 (the structural fix):** rewrote `JoinCrowdModal` as a state machine with one Modal that internally swaps views (`scanning | looking-up | confirming | joining-* | idle`). State transitions don't involve Modal lifecycle; they're just React renders inside one persistent Modal. The iOS mechanism that dropped the third presentation has nothing to act on.

**Lessons that compound:**

- The instrument-first principle was added to the working principles list above. Two iterations of "fix based on hypothesis" cost more than one iteration of "instrument, observe, fix" would have. Worth remembering on any future bug where a hypothesis-driven fix doesn't resolve the symptom.
- iOS Modal lifecycle is a real abstraction with real failure modes. Multi-Modal coordination via state flags is structurally fragile because React batches state updates and iOS expects sequential lifecycle events. The structural answer is "one Modal with internal state" rather than "multiple coordinated Modals." Apply this pattern preemptively to any future flow that has a lookup-confirm-consume shape.

---

## Deep linking and invite share flow

> **Status:** shipped. Both send side (Invite button, PR landed earlier) and receive side (`crowd://` deep links, PR #71, May 2026) are in production. The section preserves the original "what's needed" framing as a historical record of the work that was done.

Currently the invite link `crowd://join/<id>` is shared via Share.share() but isn't tappable: tapping it from outside the app doesn't open the app because the URL scheme isn't registered.

The send side (Invite button generates and shares) is now built. The receive side (tapping a `crowd://` URL opens the app and routes to the right screen) is not.

What's needed:

- Add `"scheme": "crowd"` to `app.json`.
- Wire React Navigation's `linking` config to route `crowd://join/:id` and `crowd://join-token/:token` to the appropriate screens.
- Handle cold launch (app not running), warm launch (app backgrounded), app-already-in-different-state (e.g., user is mid-create when a deep link arrives), malformed URLs, nonexistent crowds, expired tokens.
- Use the same confirmation flow as the QR scan path (the unified `JoinCrowdModal` state machine handles this naturally — deep link entry just sets the initial state to `looking-up` instead of `scanning`).

Realistic estimate: 2-3 hours including testing. The receive side is now smaller than the previous estimate because the unified Modal eliminates a lot of the "where does the deep link land?" routing ambiguity.

Universal Links / App Links (`https://crowd.app/...`) are a separate, larger piece of work for production. Custom scheme is fine for dev and TestFlight.

---

## Local development environment yak-shave observations (May 2026)

Surfaced during the QR scan diagnostic work. Filed here so future-you doesn't re-discover them.

- **Docker compose holds port 8080 if you started it earlier.** When `pnpm dev:server` (which runs `tsx watch`) tries to start, it silently fails to bind because Docker is already on the port. The dev server's logs may not surface this clearly. Symptom: `lsof -i :8080` shows `com.docke` listening, not `node`. Recovery: `lsof -ti :8080 | xargs kill -9` then restart `pnpm dev:server`. Worth adding a startup check to the dev script that fails loudly if 8080 is already taken.
- **Local DB schema can be stale relative to source code.** Running migrations is a manual step (`pnpm migrate` from `apps/server`). When you pull a branch with new migrations, you need to run them locally before the dev server can serve those endpoints. Symptom: queries return "Failed query: select ... from <table>" with truncated error messages. Worth adding a startup check to the dev server that compares applied migrations against expected migrations and warns on drift.
- **Expo env files belong in `apps/mobile/`, not the repo root.** The repo root `.env` is read by the server and devtools (which use dotenv directly), but Expo doesn't look there. Mobile builds need their own `apps/mobile/.env`. Without it, `EXPO_PUBLIC_API_URL` falls back to whatever default the source code has (currently `http://localhost:8080` which doesn't work from a phone). Worth either (a) configuring Expo to read the root `.env` or (b) creating `apps/mobile/.env` and gitignoring it consistently.
- **Fail-loud instead of localhost-fallback.** The current code defaults to `http://localhost:8080` if `EXPO_PUBLIC_API_URL` is missing. From a phone, localhost is the phone itself, which produces "Network request failed" errors with no clear cause. Fail-loud (throw at startup, or render an error screen) would be more debuggable. Small fix; worth doing.
- **iOS platform versions can lag the phone's OS.** When iOS auto-updates the phone past what Xcode's installed platforms cover, dev builds fail with "iOS X.Y is not installed." Fix is to download the matching platform via Xcode → Settings → Components. Sometimes Xcode itself needs updating first (App Store).
- **Provisioning profiles need attention on first build per environment.** First time you build to a physical device on a new dev environment, Xcode needs to generate a provisioning profile. Open the project in Xcode (`open apps/mobile/ios/Crowd.xcworkspace`), Signing & Capabilities tab, ensure team is selected and "Automatically manage signing" is on. One-time setup per machine.
- **Dev build vs TestFlight build coexistence.** They use the same bundle identifier. Installing one over the other is fine; running both at once on the same device isn't.

These are all real-world problems future-you will hit if working on multiple machines or after long breaks. Worth a "Local development setup" doc that walks through them, or just keep this list updated.

---

## ZodError → 400 standardization (May 2026)

Validation errors on the server returned 500 Internal Server Error for any handler that did `try { Schema.parse(body); ... } catch { return reply.status(500) }`. Ten handlers in `apps/server/src/app.ts` used this pattern. Schema-validation failures are client errors, so 400 is the correct status.

Fix: added a global `setErrorHandler` in `buildApp()` that distinguishes `ZodError` from other thrown errors, returning 400 with `{ error: 'ValidationError', issues: [...] }` for the former and preserving the existing 500 shape for everything else. Each of the 10 catches gained a single `if (err instanceof ZodError) throw err;` line at the top to let validation errors propagate to the global handler while preserving the existing per-handler logging for real server errors. Five tests asserting the old 500 behavior were updated to assert 400.

**Load-bearing lesson surfaced: the `createApp.ts` test-helper drift was a real correctness hazard, not a polish item.** The production fix initially looked complete, but tests still saw 500s because they were exercising the helper, not the production app — the same edit had to be applied twice. This incident was the first concrete instance where the drift caused a visible problem. Two more followed within 48 hours (schemas test dedup; rate-limit on POST /messages), at which point the structural fix shipped — see "createApp.ts consolidation" below.

Logging behavior was made explicit at the same time: validation errors log at `info` level (they're client errors, not server errors), while real server errors continue to log at `error` level. Without this change, the global handler would have replaced per-handler error-level logging with global error-level logging — same noise, different location.

The mobile client now receives a richer error body but doesn't yet render the `issues[]` array; it falls back to a generic toast. Field-level error rendering is filed as a small mobile followup, deferred until the next screen with multiple fields lands (settings, onboarding).

---

## Dev-server preflight checks (May 2026)

Two checks now run at dev-server startup before `server.listen()`, gated to `NODE_ENV !== 'production'`:

- **Port 8080 availability** — fatal on conflict, with a diagnostic + recovery message that explicitly names Docker compose as the usual culprit and gives both `docker compose down` (preferred) and `lsof -ti :8080 | xargs kill -9` (fallback) as recovery commands.
- **Migration drift** — warns when `_journal.json` entry count and `drizzle.__drizzle_migrations` row count diverge, in either direction. "Behind" means run migrations (common). "Ahead" means a branch was reverted (rare). Fresh DB (table doesn't exist) gets its own message.

Implementation in `apps/server/src/preflight.ts`. Both checks log at `console.warn` level rather than via the Fastify logger because the logger isn't fully initialized at preflight time.

**One small lesson worth remembering: match the real bind exactly when probing for availability.** The port check originally used `createServer().listen(port)` without an explicit host and silently passed on macOS dual-stack systems — IPv6 was free while IPv4 was held, and the check bound to IPv6. Threading `host` through so the check uses the same `{ port, host }` shape as the real `server.listen()` fixes it. This creates a useful invariant: if the server's bind specifics ever change (e.g., binding only to `127.0.0.1` in dev), the preflight follows automatically.

These checks fold in the operational gotchas from the May 2026 yak-shave observations (documented earlier in this doc) that came up during the QR scan diagnostic work. The "Local development environment yak-shave observations" section above describes the original symptoms; this entry describes the fix.

---

## Shared-schema test dedup (May 2026)

`packages/shared/__tests__/schemas.test.ts` and `packages/shared/tests/schemas.test.ts` both existed for some unknown stretch of time. The followups doc filed this as "overlapping coverage, maintained consistently in Round 4, worth deduping in a separate small PR."

The cleanup turned out to be even cleaner than expected: `tests/schemas.test.ts` was dead code. The vitest config's `include: ['__tests__/**/*.test.ts']` had never matched it. Coverage diff was a strict superset — every test in `tests/` was already covered (most more thoroughly) in `__tests__/`. The file received its last update during the Round 4 identity rearchitecture, but Phase B's "adaptive feed tick, expired-post filter, tighter post-input caps" updates landed only in `__tests__/`. The "maintained consistently" framing in the followups doc was technically true at one snapshot in time and silently false from Phase B onward.

Fix: delete `packages/shared/tests/schemas.test.ts` and its now-empty parent directory. No content migration. 64 tests in `__tests__/` continue passing.

**Load-bearing lesson — see the createApp.ts incident in the ZodError → 400 entry above.** Two examples now: createApp.ts drift hid behind "Round 4 surfaced it again" framing, and schemas test dedup hid behind "updated consistently" framing. Both had the same shape: a doc entry claimed two artifacts were maintained in lockstep when in fact one was silently drifting. The cheap check that would have caught both: "does the test runner / build pipeline / consumer actually exercise both?" If only one runs in CI, the lockstep claim is at best aspirational. Worth applying this check pre-emptively whenever a doc entry frames an item as "two files, maintained consistently."

---

## Cleanup script automated (May 2026)

`apps/server/src/scripts/cleanup-expired.ts` was a one-shot script with `process.exit` at the end — runnable manually, but not scheduled. Without automation, the dev DB grew monotonically toward Neon's free-tier ceiling, and the problem would accelerate with more testers.

Fix: refactored the deletion logic into a pure function (`apps/server/src/jobs/cleanupExpired.ts`) that takes a Drizzle DB instance and returns counts. The original script became a thin wrapper preserving manual `pnpm cleanup`. A scheduled entry point (`apps/server/src/jobs/runCleanupJob.ts`) is compiled into the server image and triggered by a Fly scheduled machine running hourly.

**One operational thing worth knowing:** Fly's scheduling for ad-hoc tasks is imperative (`fly machine run --schedule hourly --command ...`), not declarative in `fly.toml`. The activation command is committed as `apps/server/scripts/setup-cleanup-schedule.sh` with a comment block explaining the rationale (image tag, cadence, production rollout path). It's a one-time invocation per environment — running it after deploy registers the schedule with Fly. The script is self-documenting; future readers don't have to reconstruct the decision from tribal knowledge.

Cadence is hourly. Server-side and client-side filters already exclude expired rows from query results, so user-visible behavior is correct regardless of when the actual DELETE happens. Hourly is the finest cadence Fly's native scheduler supports without falling back to GitHub Actions; for dev traffic this is fine.

Four integration tests cover the function directly. No test of the Fly scheduling itself — the schedule is configuration, not code, and Fly's own machinery is trusted.

---

## Rate-limit on POST /messages (May 2026)

The wider TestFlight threat model includes a malicious or buggy client posting in bursts — either at one location or across many. The cleanest defense for that specific case is a per-user rate limit on `POST /messages`, returning 429 Too Many Requests when the budget is exceeded.

Implementation uses `@fastify/rate-limit` (new dependency, Fastify-5-compatible major). Registered with `global: false` so it applies per-route rather than to all endpoints. Per-route config on `POST /messages` with `hook: 'preHandler'` so body parsing happens first (the rate-limit key comes from `body.userId`, which doesn't exist until the body is parsed).

Defaults: 10 posts per 1-minute window. Both are overridable via `POST_RATE_LIMIT_MAX` and `POST_RATE_LIMIT_WINDOW` env vars — useful for the test suite, which sets a short window so the "rate limit resets after the window" test can run in 500ms instead of 60 seconds.

Identity key: `body.userId` with `req.ip` fallback. The `userId` field is the per-context user identity (rotating global identity for global posts, crowd-specific ID for crowd posts). The IP fallback covers requests that arrive malformed (body parsing fails before the rate-limit hook reaches the userId).

**Two Fastify lifecycle gotchas worth remembering:**

- The plugin's `hook` is a registration-time option, not per-route config. Setting it per-route is silently ignored. Set it once at registration.
- `app.register(rateLimit, ...)` must be `await`ed before any routes are declared. If the await is missed, the plugin's `onRoute` hook never fires for the routes already registered, and per-route configs are silently dropped. The first symptom was `x-ratelimit-*` response headers coming back undefined.

The threat model this addresses: burst posting. The threat model it doesn't address: a single well-paced legitimate-looking post at arbitrary coordinates. Those are the higher-complexity defenses (location consistency with recent activity, GPS accuracy thresholds, signed location attestations) and remain on the active backlog.

For production, the in-memory rate-limit storage works but doesn't survive across Fly machine restarts. Redis adapter is available in the plugin when production traffic justifies it.

---

## createApp.ts consolidation (May 2026)

For an unknown stretch of time, `apps/server/__tests__/helpers/createApp.ts` was a hand-mirrored 561-line copy of the production routes in `apps/server/src/app.ts`. The followups doc filed this for months as "drift" — every endpoint change had to be made in both files, and the entries called for a structural fix paired with the React Native component testing infrastructure pass.

Three concrete incidents in two days made the case urgent:
- **ZodError → 400 standardization:** the same `if (err instanceof ZodError) throw err;` line had to be added in both files. Production fix initially looked complete; tests still saw 500s because they were exercising the helper.
- **Schemas test dedup:** the dead-code finding (`tests/schemas.test.ts` never ran) was the same shape of unverified-lockstep assumption that the createApp.ts entry had been carrying.
- **Rate-limit on POST /messages:** registration and the matching error-handler tweak had to be added to both files.

Beyond the maintenance cost, discovery surfaced a real correctness divergence between the two implementations. `POST /crowds/:id/join` and `POST /messages/:id/boost` had identical observable behavior achieved via different mechanisms — production pre-checks for existing rows; the test helper caught unique-constraint violations. The tests had been passing against either mechanism because their assertions were permissive (`>= 400 && < 600`). If production had ever dropped the pre-check (or vice versa), the test would have silently kept passing while shipping broken behavior.

Fix: parameterized `buildApp(opts?: { db?, cors?, logger? })` matching the prior art already in `cleanupExpired(db)`. Each option defaults to production behavior; tests pass `{ db: getTestDb(), cors: { origin: true, credentials: true }, logger: false }`. The ~30 `db.<verb>` references inside `buildApp` were resolved cleanly by renaming the singleton import to `defaultDb` and shadowing it with a function-local `db` const — the call sites themselves didn't change.

`createApp.ts` was deleted (-561 lines). Four test call sites updated. Net change: -529 lines across 5 files. All 55 server tests pass against the consolidated handler.

**Lessons worth carrying forward:**

- **When duplicate-implementation drift accumulates concrete incidents, consolidating becomes correctness work, not just maintenance work.** The drift in `/crowds/:id/join` and `/messages/:id/boost` was masking a real implementation divergence between what's tested and what runs in production. Three incidents in 48 hours made the case overwhelming; before that, the entry could have continued to ride as "polish" indefinitely.
- **A "small DI seam" can be cleaner than it sounds when the prior art exists.** `cleanupExpired(db)` was already the pattern; extending it to `buildApp(opts)` was mechanical because the shape was proven. Surfacing the prior art during discovery is what made the 1.5-hour estimate honest rather than aspirational.
- **The `pg.Pool` singleton-at-module-load pattern is benign when queries are gated.** Discovery worried that test paths might accidentally trigger the production singleton's connection attempt. In practice, `pg.Pool` only opens connections on first query, not at construction — so the singleton sits inert as long as nothing queries it. Worth knowing for any similar singleton patterns elsewhere.

---

## Field-level error rendering for validation errors (May 2026)

The followups doc filed this as "consume the server's richer ValidationError contract." Discovery revealed that the shared-schema architecture means server-returned ValidationErrors essentially can't reach the user today: `packages/api/src/client.ts` pre-parses every request with `Shared.<Endpoint>Schema.parse(data)` before sending. Any value that would trip the server's schema gets caught client-side first, thrown as a `ZodError`, and (until now) stringified into a generic toast.

The reframed work: catch `ZodError` from the client-side pre-parse — the path that actually fires on real user input — and wrap it as a typed `ValidationError` that callers can render inline. The server-side response handling falls out symmetrically: when the server *does* return `{ error: 'ValidationError', issues: [...] }`, it's converted to the same class via the same code path. Rare in practice (the shared schemas make server validation almost never fire), correct to handle.

The implementation centralized the pre-parse wrapping into one `parseRequest<S>(schema, data)` helper in `packages/api/src/client.ts`. All 10 endpoint pre-parses route through it, and any future endpoint inherits the same behavior automatically. The small upfront refactor cost (typing the helper as `z.ZodTypeAny + z.infer<S>` for inference to work through call sites) pays back at every endpoint forever.

Response-side handling: the 400-response branch parses the body as JSON, detects the ValidationError shape, and throws the typed class. The body is read exactly once — `response.json()` and `response.text()` both consume the response body, so the existing-text-then-parse-as-JSON pattern was the cleanest shape. Response-schema parse failures (server returning something the client doesn't recognize) still bubble as raw `ZodError` — those are contract violations, not user-input errors, and shouldn't render inline.

One consumer wired up: `CreateMessageScreen` catches `ValidationError`, routes the `text` issue to react-hook-form's `setError`, and falls back to toast for unmatched fields (slider-derived and GPS-derived values the user can't fix inline anyway). Inline error renders in `ember-warn` color below the character counter.

**Honest limitation worth knowing:** the most realistic trigger for the new inline path is gated out today. The `CreateMessageScreen.onSubmit` handler has an existing empty-text check that returns early with a toast before the pre-parse runs. So the empty-message case — the one path that would naturally exercise the new inline rendering — never reaches the new code. The field-level path is correctly wired, will fire if the empty-text guard is relaxed (a small UX decision filed separately), and will fire for any future input that bypasses the existing client-side guards. Until then it's mostly defensive plumbing that's correct to have in place.

**Lessons worth carrying forward:**

- **Discovery's job is sometimes to reframe the work.** The followups entry's premise was based on an architectural assumption that didn't hold once examined. Discovery surfaced the mismatch; the reframed version delivers real value but adjacent to what was originally filed. The alternative — implementing the original premise — would have produced plumbing that fires for no realistic case. Trusting discovery's finding mattered more than honoring the original framing.

- **Centralizing a small refactor at the choke point compounds.** Wrapping every pre-parse via one `parseRequest` helper means new endpoints inherit the behavior without remembering to wrap them. The cost (small generic typing puzzle) paid back across 10 existing endpoints and every future one.

---

## testDb.ts migration drift fix (May 2026)

The followups doc filed this for months: `apps/server/__tests__/helpers/testDb.ts` hand-mirrored migration SQL inline (5 CREATE TABLE statements, 10 indexes in a 63-line string template). The entry's framing was that this hand-mirror pattern allowed schema/migration drift to go unnoticed. Discovery confirmed exactly that — production had `idx_messages_active_geo` (a composite covering index for the feed query, added in migration 0003), but testDb.ts didn't. Tests had been running against a schema with 6 of the 7 reconciled indexes from migration 0003 but not the seventh, the one the feed query actually depends on.

The fix: replace the inline `migrationSql` constant with a call to Drizzle's migration runner (`drizzle-orm/node-postgres/migrator.migrate`). Tests now run the actual migrations from `apps/server/drizzle/` rather than a hand-mirrored copy. Any future migration propagates to tests automatically without anyone having to remember to update the helper.

Mechanical change: ~5 lines added, 67 lines removed. testDb.ts went from 146 lines to 83. No test failures from the schema change — the missing index didn't cause any test to incorrectly depend on plan-specific behavior, but tests now exercise the same physical plan production uses.

Verification used a temporary probe inside `setupTestDb()` to confirm `__drizzle_migrations` had 5 rows (matching the 5 migration files) and `idx_messages_active_geo` was present in the test schema. Probe removed after confirming. This pattern — add temporary check, confirm, remove — is the cleanest proof-of-fix for infrastructure changes where you can't easily assert on the change from the public API.

**Lessons worth carrying forward:**

- **The hand-mirror pattern is structurally fragile.** Three concrete incidents in 48 hours surfaced this: ZodError → 400 standardization (createApp.ts forced duplicate edits), schemas test dedup (parallel test file was dead code drifting silently), and now testDb.ts migration drift (the 7th index never made it to tests). Each was small individually; together they're a pattern. When a doc entry frames two artifacts as "maintained consistently" or "updated in lockstep," the cheap check that prevents silent drift is "does the runner / build pipeline / consumer actually exercise both?" If only one runs, the lockstep claim is at best aspirational.

- **Temporary probes are clean for proof-of-fix.** For changes where the success criterion isn't visible from the public API (an index exists, a migration ran, an env var was read), a temporary check inserted into the relevant code path is more honest than just running existing tests and saying "looks fine." Add the check, confirm the result, remove the check. The change set stays clean and the verification was real.

- **The "drift" framing in followups entries should imply urgency proportional to evidence.** This entry sat in followups for months with the same wording. The morning's createApp.ts work and the schemas dedup were the first two incidents that turned an abstract concern into concrete evidence. By the time this fix landed, the drift had bitten three times — but the entry's framing in followups never changed to reflect that. Worth being more aggressive about updating followups entries when concrete incidents appear, rather than letting them ride at their original framing.

---

## Source-direct workspace exports (May 2026)

For months, every CI step that touched workspace types had to remember to run `pnpm --filter @repo/shared build && pnpm --filter @repo/api build` first. The pattern bit at least four times across Phase A/C work: failed typecheck runs, Vercel build failures, EAS post-install hooks, Dockerfile pre-build steps. The followups entry filed this as a class of bug that the `exports` field with TS resolution would structurally eliminate.

The fix: add a conditional `exports` block to `packages/shared/package.json` and `packages/api/package.json`. The shape:

```json
"exports": {
  ".": {
    "types": "./src/index.ts",
    "development": "./src/index.ts",
    "react-native": "./src/index.ts",
    "browser": "./src/index.ts",
    "default": "./dist/index.js"
  }
}
```

TypeScript reads `types` first; Vite dev and Vitest match `development`; Metro matches `react-native`; Vite production builds match `browser`; Node in production runs `default` (the compiled `dist/`). The conditions are ordered most-specific to most-general — order matters in the `exports` field.

The plan called for three conditions (`types`/`development`/`default`); reality needed five. Vite production builds and Metro have their own conditions that the original three didn't match. Worth knowing for future packages: the conditional exports pattern wants explicit conditions for each consumer environment, not just dev/types/default.

**Three scope expansions beyond the plan, each required to make source-direct actually work:**

- **tsconfig moduleResolution changes.** The plan said don't touch consumer tsconfigs. TypeScript itself emitted the diagnostic: `moduleResolution: "node"` (legacy) doesn't honor the `exports` field. `packages/api/tsconfig.json` and `apps/server/tsconfig.json` switched to `Node16`; `apps/mobile/tsconfig.json` switched to `bundler`. Without these, the entire premise of the change fails.

- **Project reference removal.** The plan said leave composite/references alone. `packages/api/tsconfig.json`'s `references: [{ path: "../shared" }]` was load-bearing for the old dist-orchestrated build: composite project references force TypeScript to look for emitted `.d.ts` files (TS6305), which directly defeats source-direct. Removed.

- **Additional types declaration.** `apps/devtools/tsconfig.app.json` needed `"node"` added to `types` because source-direct surfaced a latent `process.env` reference in `packages/api/src/client.ts` that dist isolation had been hiding.

**Three workarounds got deleted:**
- The `commonjsOptions.include` block in `apps/devtools/vite.config.ts` (with its long comment explaining why it existed).
- The "Build packages" pre-steps in `.github/workflows/test.yml` typecheck and test-mobile jobs (the build job's still-needed pre-step stays).
- The `eas-build-post-install` script in `apps/mobile/package.json`.

Plus the pre-build line in the Dockerfile's dev target. The build and prod stages still produce/copy `dist` because production runs `node dist/index.js`.

**Verification was thorough:** clean-state `pnpm -r typecheck` passes without any prior build, all test suites pass (64 + 38 + 26 + 57 = 185 tests across the workspaces), Vite dev and build both clean, Expo's Metro bundles produce a valid iOS export, the server's `tsx` dev path resolves to source and the `node` prod path resolves to dist. Server integration tests and `docker build` couldn't run locally (Docker daemon absent) but the changes to those paths are minimal and CI runs them.

**Lessons worth carrying forward:**

- **Plans constrain hypotheses, not reality.** Three scope expansions were necessary in this work, each because the plan's assumption ("don't touch X") was based on a hypothesis that turned out to be wrong. The right call is to adjust scope when reality disagrees, with the reasoning visible in the stop report — not to pretend the original scope worked, and not to silently bail.

- **Conditional exports want one condition per consumer environment.** The minimal shape (types/default) covers TypeScript and Node. The full shape needs `development` for Vite/Vitest dev, `react-native` for Metro, `browser` for Vite production builds. Future packages should start with the full set; adding conditions later means re-verifying every consumer.

- **Source-direct exposes latent code that compiled output hides.** The `process.env` reference in `packages/api/src/client.ts` worked in every current consumer because each had ambient `process` in some form (Node has it, Vite substitutes it, Metro's babel handles it). It's not strictly isomorphic — filed as a small followup. Worth knowing: switching from compiled to source consumption tends to surface this kind of environment dependency.

- **Composite project references are coupled to dist-based consumption.** Removing one without the other produces "stale tsbuildinfo" workarounds. The `packages/shared/tsconfig.json` still has `composite: true` but nothing orchestrates it anymore; filed as a small followup to drop. Not urgent, but a real piece of orphaned config.

---

## You tab and Clear my data (late-May 2026)

The followups doc had carried a Settings/preferences screen item since the Ember migration. It shipped as the **You** tab: a fourth bottom-tab surface showing identity rotation status, location permission, app version and native build number, and a Clear my data action. The arc spanned a server endpoint (`POST /users/delete`, deployed to Fly) and the mobile screen consuming it.

### Soft-wipe semantics (Option B)

The endpoint implements a soft wipe rather than a hard delete. For the user's own messages:

- Messages with zero remaining boosts are deleted outright.
- Messages still boosted by other users have `ownerId` set to NULL. They survive as anonymous orphan posts with their text and location intact.

Boosts the user themselves issued are deleted, and the parent message's `boostCount` is decremented in lockstep so the denormalized counter stays honest. All crowd memberships keyed to any of the user's UUIDs are removed.

The principle: take down the user's own attribution, preserve what the community is carrying. Crowd's purpose is sharing information others depend on. Warnings that other users have chosen to amplify (by boosting) are information the community has already invested in carrying. Wiping the original poster's attribution honors the privacy request without destroying that community-level value.

### Owned-crowd handling (orphan, both open and private)

Crowds the user owns are not deleted. The user's own membership row is removed by the general memberships sweep, and the crowd row plus its `ownerId` are left intact. The `ownerId` becomes a UUID no longer held by any device.

The first instinct was different: delete private crowds the user owns, on a "compromised owner, close the door" security rationale. That was reversed. Deleting a crowd destroys other members' posts and information they may be relying on, for an app whose whole purpose is sharing information others depend on. The owner wiping their data is a statement about the owner's safety, not the crowd's integrity. From the members' side, an owner who wipes is just an owner who stopped posting and stopped inviting, which is a survivable state. Orphaning costs at most "no new invites for the rest of the crowd's 24h life." Deleting costs "the coordination space and its information disappear for everyone." Orphaning is the lower-harm option and is consistent with the soft-wipe principle already chosen for messages.

A load-bearing fact surfaced in discovery and informs how the orphaning behaves: `crowds.ownerId` is read at two sites. `/crowds/:id/proximity-token` is owner-only (it gates whether a token can be minted at all), and `/crowds/lookup` computes `canInvite = crowd.isOpen || isOwner`. For **private** crowds (`isOpen=false`) those two combine to mean: only the owner can invite, by any mechanism. An orphaned private crowd therefore cannot issue new invites for the rest of its 24h lifetime. This is accepted and intended; the crowd serves its existing members until natural expiration. Note that today the only person who could ever invite to a private crowd is the owner anyway, so an owner who wipes leaves nobody worse off on the invite axis than they already were. **Open** crowds are essentially unaffected by orphaning, since anyone can join by ID without an owner.

### EXISTS over denormalized counters

The anonymize-vs-delete branch reads authoritative boost-row state via `EXISTS` against the post-deletion `message_boosts` table, not the denormalized `boostCount` column and not a (total - deleted) subtraction. The reasoning: the delete-vs-anonymize decision must read real row state so it can't be fooled by counter drift. `boostCount` is maintained correctly for the messages that survive, but it is not the source of truth for the branching decision.

An interaction test proves the case that catches counter-based implementations: a message owned by the wiping user, boosted by both the wiping user (via a second wipe-set UUID) and an external user. The user's own boost is deleted, the external boost survives, and the message anonymizes correctly. A naive (total-deleted) check would route this to delete and FK-violate against the surviving boost row; the EXISTS predicate routes it to anonymize as intended.

### Trust model

The delete endpoint inherits the project's existing trust model: it trusts the UUIDs in the body with no signature or token, identical to every other endpoint. Anyone submitting a delete must already hold the UUID, which is a device-local SecureStore secret. Worst case is self-DoS of one's own data. The endpoint header comment names this explicitly so future readers don't add ceremony that isn't called for.

### Mobile-side local reset ordering

On server success, local state is reset in this order: `clearAllCrowdUserIds()` then `rotateGlobalIdentityNow()`. The rotate helper internally calls `clearAllRecords()`, so the AsyncStorage records get wiped as part of it; no separate call is needed. The order matters for a narrow window: if global were rotated first, the device would briefly hold a fresh global UUID alongside stale crowd UUIDs, and any inflight crowd request could leak via a stale identifier the server has already dropped. Clearing crowd IDs first closes that window.

On server failure, no local state is touched. A partial wipe (local cleared but server delete failed) would orphan the device from data still attributed to those UUIDs on the server, with no way to ever re-issue the delete. The user keeps every UUID and can retry. The endpoint is idempotent under retry.

**Lessons worth carrying forward:**

- **The right principle for destructive actions on shared infrastructure is "take down attribution, preserve community-carried value," not "delete everything attributable."** The reflex to delete-everything is symmetric and easier to reason about, but it externalizes harm to other users. The soft-wipe split (delete what is purely the user's, anonymize what others have invested in) takes more code but produces the right outcome.

- **Read real row state for branching decisions, not denormalized counters.** Counters drift. EXISTS predicates against the actual table cannot. When the choice between two outcomes (delete vs. anonymize) is load-bearing, the cost of reading the authoritative state is trivial compared to the cost of getting fooled by a stale counter.

- **Verify what columns gate before assuming they're inert.** The first sketch of this work assumed `crowds.ownerId` was set at create-time and never read for anything load-bearing. A read-only verification pass found two real authorization paths gated on it, which changed the framing of the owned-crowd discussion from "harmless orphan" to "real but acceptable tradeoff." The verification cost was twenty minutes; landing the orphan without that knowledge would have been a quiet footgun.

- **Honest copy beats marketing copy on privacy surfaces.** The You tab's identity-status copy went through several iterations because the rotation clock is a lower bound, not a literal countdown. The shipped wording uses "after your last post expires" and "once you next use the app" to acknowledge that rotation is conditional on activity rather than a wall-clock event. Privacy surfaces in particular should not promise more than the system actually delivers.

- **Reversals are part of the design conversation, not a failure of it.** The owned-crowd handling went from "delete private crowds" to "orphan everything" mid-arc, based on whose harm was being optimized for. Recording both the original instinct and the reversal preserves the reasoning for whoever revisits this later.
