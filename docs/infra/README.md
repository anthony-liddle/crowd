# Infrastructure phase reports

Crowd's infrastructure work is organized into discrete phases, each with explicit scope, stop-gates between sub-phases, and a written report at the end. New phases add a row to the table below.

The reports document what shipped, what was discovered along the way, and what each phase leaves for the next. They're intended as durable references, not session transcripts — anyone reading them six months later should be able to reconstruct the deploy story and find every external resource and secret name without spelunking through commits.

## Reports

| Phase | What it covered | Report |
| ----- | --------------- | ------ |
| A | Repository hygiene before deploy setup | [PR #56](https://github.com/anthony-liddle/crowd/pull/56) (no written report) |
| B | Local development with docker-compose and seed script | [PR #57](https://github.com/anthony-liddle/crowd/pull/57) (no written report) |
| C | Cloud dev environment: Neon, Fly.io, Vercel, GitHub Actions | [phase-c.md](./phase-c.md) |

Phase C is the first phase with a written report; A and B are linked to their merge PRs since the work shipped without a standalone writeup. Future phases get a row here pointing at a sibling `phase-<letter>.md`.

## Conventions for new phase reports

- File at `docs/infra/phase-<letter>.md`.
- Sections: TL;DR, files-by-sub-phase, external resources, secrets (names only — never values), deviations from the phase prompt, verification (what was tested, what wasn't), carry-overs, what the next phase needs.
- Voice: plain, direct, technically specific. Should read like notes someone would write up after a careful infrastructure change, not a corporate runbook.
