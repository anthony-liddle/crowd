// Parses crowd invite payloads encoded as URLs. Two shapes are recognized:
//   crowd://join/<crowdId>                       — open-crowd invite
//   crowd://join-token/<token>?cid=<crowdId>     — proximity-token invite
// The token shape requires `cid=<uuid>` so the client can mint a crowd-
// specific user id before consuming the token. Token payloads without a
// valid cid are rejected as malformed.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CrowdInvite =
  | { kind: 'open'; crowdId: string }
  | { kind: 'token'; token: string; crowdId: string };

export function parseCrowdInvite(input: string): CrowdInvite | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare UUID — treat as open invite by id (legacy paste behavior).
  if (UUID_RE.test(trimmed)) {
    return { kind: 'open', crowdId: trimmed };
  }

  if (trimmed.startsWith('crowd://join-token/')) {
    const rest = trimmed.slice('crowd://join-token/'.length);
    const [tokenPart, queryPart] = rest.split('?');
    if (!tokenPart || !queryPart) return null;
    const params = new URLSearchParams(queryPart);
    const cid = params.get('cid')?.replace(/\/+$/, '');
    if (!cid || !UUID_RE.test(cid)) return null;
    return { kind: 'token', token: decodeURIComponent(tokenPart), crowdId: cid };
  }

  if (trimmed.startsWith('crowd://join/')) {
    const id = trimmed
      .slice('crowd://join/'.length)
      .split('?')[0]
      .replace(/\/+$/, '');
    if (id && UUID_RE.test(id)) {
      return { kind: 'open', crowdId: id };
    }
    return null;
  }

  return null;
}
