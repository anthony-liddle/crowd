# Bug: Posts can be geotagged with stale coordinates

## Summary

When a user creates a post, the latitude/longitude attached to that post is **not fetched fresh at submit time**. Instead, the client sends whatever lat/lng was captured when `CreateMessageScreen` first mounted — which may be minutes or hours old if the app was backgrounded, the device slept, or the user moved between screen-mount and tapping "Post".

The backend trusts the client coordinates verbatim, so the post is persisted at the stale location and becomes visible to anyone within the post's `radiusMeters` of the **stale** point — not the user's actual current location.

## Reproduction

1. Open the app at location A. `CreateMessageScreen` mounts and `useLocation` captures A.
2. Background the app (or let the device sleep) and travel to location B, > the post's reach distance away from A.
3. Foreground the app and submit the post (with reach set small enough that A and B should not overlap, e.g. 0.1 km).
4. Observed: the post appears in feeds at location A, not at B. A viewer at A sees the post even though the user was at B when they tapped Post.
5. Expected: the post appears in feeds at B only.

## Root cause

Three behaviours combine:

1. **`apps/mobile/src/hooks/useLocation.ts:32`** — `Location.getCurrentPositionAsync({})` is called once inside a mount-time `useEffect`. The result is held in local React state. There is no listener for app-resume, no timestamp check, and no automatic refresh.
2. **`apps/mobile/src/screens/CreateMessageScreen.tsx:120`** — `onSubmit` reads the `location` state value directly when building the request body. It does **not** call `refreshLocation()` first, and does not inspect the reading's age.
3. **`apps/server/src/app.ts:242-243`** — `POST /messages` stores `body.latitude` and `body.longitude` as received. There is no server-side re-derivation or sanity check.

JS execution is suspended while the app is backgrounded or the device is asleep, so the mount-time `useEffect` never re-fires on resume. The captured value can be arbitrarily old.

## Related, lower-severity instance

**`apps/mobile/src/screens/FeedScreen.tsx:107-112`** — the initial feed load on focus uses the same mount-time snapshot from `useLocation`. Pull-to-refresh (`:116`) does call `refreshLocation()`, but a cold app-open will briefly render the feed for the *previous* location before any refresh. Same root cause; less harmful (read vs. write).

## Proposed fix shape (not yet implemented)

- `onSubmit` must `await` a fresh `getCurrentPositionAsync` (or equivalent) before building the post body. Block submission on the result; do not optimistically post with the cached value.
- Reject readings older than some threshold (e.g. 30 s by `Location` object `.timestamp`) — `getCurrentPositionAsync` can return cached OS values, especially just after device wake.
- Treat the `useLocation` hook's stored value as a display hint only. Anything that *acts* on location (post submission, feed query) should re-fetch authoritatively at the moment of action.
- Apply the same treatment to `FeedScreen`'s initial focus load.

## Questions that need answering before implementing

1. **Acceptable submit latency.** A fresh `getCurrentPositionAsync` can take from ~100 ms to several seconds depending on GPS lock state. What's the maximum delay we accept before showing a timeout / "couldn't get your location" error? What does the button look like during the wait?
2. **Staleness threshold.** What's the maximum age of a location reading we'll accept? 10 s? 30 s? 60 s? This affects both how often we reject OS-cached values and the UX of slow-GPS situations.
3. **Accuracy threshold.** `Location` readings carry an `accuracy` field (radius of confidence in meters). Should we reject readings where `accuracy > radiusMeters` of the post — i.e. the GPS uncertainty exceeds the post's reach? Otherwise a 0.1 km post with ±500 m accuracy is essentially randomly geotagged.
4. **Failure UX.** If the fresh fetch fails (permissions revoked mid-session, GPS unavailable indoors, timeout), do we (a) block the post entirely, (b) allow the user to retry, or (c) allow them to opt into "post without precise location" with a clear warning?
5. **Server-side defence in depth.** Should the API reject posts whose `(latitude, longitude, timestamp)` is implausible relative to the user's previous post (e.g. would require travelling > 1000 km/h)? Out of scope for this bug, but worth a ticket — the client is currently the only thing standing between a malicious user and arbitrary geotags.
6. **Feed-load behaviour on cold open.** Should the initial `FeedScreen` load on focus block on a fresh location fetch (slower first paint, but never wrong)? Or render a skeleton / "locating..." state while the fetch happens? Or accept the brief stale render and let the implicit refresh correct it?
7. **Hook API shape.** Do we want `useLocation` to expose an `async getFreshLocation()` that callers must `await`, in addition to the current `location` / `refreshLocation` surface? Making the "I need a fresh reading right now" path explicit at the call site would prevent this class of bug from recurring.
8. **Background location strategy.** Independent of this fix: do we ever want the app to refresh its location in the background, or on app-resume via `AppState` listeners? If yes, that's a separate design conversation (battery, permissions, iOS background modes) — but it would also fix the symptom.

## Out of scope for this bug

- Whether posts should expire / be re-validated against the user's current location after the fact.
- Whether the radius slider's `REACH_MAX = 5 km` is the right ceiling.
- Backend trust model for client-supplied coordinates beyond the immediate sanity check above.
