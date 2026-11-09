import type { FastifyReply } from 'fastify';

// Every domain error the API sends, keyed by its code. The reply body is
// `{ error, code }`: `error` is the prose clients have always received, and
// `code` names the cause.
//
// The codes are a contract with the clients. The iOS client matches them
// exactly against its `Rejection` raw values. A code it does not know, from a
// rename or a new cause, sends it back to reading the status, which cannot
// tell some causes apart. A cause keeps the same status and prose on every
// endpoint that sends it.
const DOMAIN_ERRORS = {
  CROWD_NOT_FOUND: { status: 404, error: 'Crowd not found' },
  CROWD_EXPIRED: { status: 400, error: 'Crowd expired' },
  CROWD_CLOSED: { status: 400, error: 'Crowd is closed' },
  ALREADY_MEMBER: { status: 400, error: 'Already a member' },
  NOT_MEMBER: { status: 403, error: 'Not a member of this crowd' },
  NOT_OWNER: { status: 403, error: 'Only the owner can generate join codes' },
  POST_NOT_FOUND: { status: 404, error: 'Message not found' },
  POST_EXPIRED: { status: 400, error: 'Message expired' },
  OWN_POST: { status: 400, error: 'Cannot boost your own message' },
  ALREADY_RELAYED: { status: 400, error: 'Already boosted' },
  INVITE_TOKEN_NOT_FOUND: { status: 404, error: 'Invalid token' },
  INVITE_TOKEN_USED: { status: 400, error: 'Token already used' },
  INVITE_TOKEN_EXPIRED: { status: 400, error: 'Token expired' },
} as const satisfies Record<string, { status: 400 | 403 | 404; error: string }>;

export type DomainErrorCode = keyof typeof DOMAIN_ERRORS;

// Sends the domain error named by `code` at its status.
export function sendDomainError(reply: FastifyReply, code: DomainErrorCode) {
  const { status, error } = DOMAIN_ERRORS[code];
  return reply.status(status).send({ error, code });
}
