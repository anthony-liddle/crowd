#!/usr/bin/env bash
#
# One-time setup: register a Fly scheduled machine that runs the expired-data
# cleanup job hourly against the dev app.
#
# WHY THIS LIVES IN A SCRIPT, NOT fly.toml
# Fly's scheduled-machines feature is created via the CLI rather than declared
# in fly.toml. There's no declarative way to express "run this command on this
# cadence" in the deploy config — `fly machine run --schedule` is imperative.
# So this script is the canonical record of the cleanup schedule, committed
# to the repo so future-you (or a collaborator) can `cat` it and understand
# how cleanup is wired without spelunking through `fly machines list` output.
#
# WHEN TO RUN
# Once, after the first deploy of the changes that introduced
# src/jobs/runCleanupJob.ts. Re-run only if the schedule needs to change or
# if the scheduled machine was deleted. NOT idempotent in the trivial sense —
# running this twice creates two scheduled machines. Before re-running,
# inspect existing machines with:
#
#   fly machines list --app crowd-dev
#
# and remove any prior cleanup machines with `fly machine destroy <id>`.
#
# CADENCE
# Fly's native scheduler accepts hourly | daily | weekly | monthly. Hourly is
# chosen here as the finest available native cadence. At dev traffic levels,
# hourly is plenty: expired rows linger up to an hour before deletion, but
# server-side and client-side filters already exclude them from query
# results, so user-visible behavior is correct regardless.
#
# If finer granularity is ever needed, the path is GitHub Actions schedule
# (e.g. `cron: '*/15 * * * *'`) invoking `fly machine run --rm` from the
# runner. That's a small, well-scoped switch — change one workflow file.
#
# IMAGE REFERENCE
# Looked up dynamically via `fly image show --app <app> --json` at script
# execution time. Fly's registry does NOT auto-tag images with `:latest` —
# images are tagged `:deployment-<ULID>` per deploy. To get a working image
# ref, we ask Fly for the current one. This means the script tracks whatever
# the app was last deployed with, which is what we want: the cleanup must run
# against the same code as the live server (schema-aware). Pinning a digest
# in this file would be a footgun (cleanup running against old code while
# migrations have moved on).
#
# Re-run the script after a major deploy if you want the scheduled machine
# to pick up the new image. Otherwise, the existing scheduled machine
# continues to run against the image it was created with. (Fly does NOT
# automatically redeploy scheduled machines when the app deploys — that's
# the trade-off of using a registered scheduled machine vs. a per-tick
# `fly machine run --rm` invocation from GitHub Actions.)
#
# FOR PRODUCTION
# When a production app ships, copy this script to set up its own cleanup
# schedule. Adjust APP. Everything else is the same shape.
#
# DEPENDENCIES
# Requires `fly` and `jq` to be installed locally. `fly auth login` must have
# been run for the user invoking this script.

set -euo pipefail

APP="${FLY_APP:-crowd-dev}"
COMMAND="node dist/jobs/runCleanupJob.js"

if ! command -v fly >/dev/null 2>&1; then
  echo "Error: fly CLI not found. Install via 'brew install flyctl' or https://fly.io/docs/flyctl/install/" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq not found. Install via 'brew install jq'." >&2
  exit 1
fi

echo "Looking up current image for app '${APP}'..."
IMAGE_JSON=$(fly image show --app "${APP}" --json)
REGISTRY=$(echo "${IMAGE_JSON}" | jq -r '.[0].Registry // empty')
REPOSITORY=$(echo "${IMAGE_JSON}" | jq -r '.[0].Repository // empty')
TAG=$(echo "${IMAGE_JSON}" | jq -r '.[0].Tag // empty')

if [ -z "${REGISTRY}" ] || [ -z "${REPOSITORY}" ] || [ -z "${TAG}" ]; then
  echo "Error: could not determine image ref from 'fly image show --app ${APP} --json'." >&2
  echo "Output was:" >&2
  echo "${IMAGE_JSON}" >&2
  exit 1
fi

IMAGE="${REGISTRY}/${REPOSITORY}:${TAG}"

echo ""
echo "Registering Fly scheduled machine:"
echo "  App:      ${APP}"
echo "  Image:    ${IMAGE}"
echo "  Command:  ${COMMAND}"
echo "  Schedule: hourly"
echo ""
echo "If this is the first run, type 'yes' to proceed; otherwise, ctrl-c and"
echo "check 'fly machines list --app ${APP}' for an existing scheduled machine first."
read -r CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

fly machine run \
  --app "${APP}" \
  --region sjc \
  --schedule hourly \
  --vm-cpu-kind shared \
  --vm-cpus 1 \
  --vm-memory 256 \
  "${IMAGE}" \
  ${COMMAND}

echo ""
echo "Done. Verify with: fly machines list --app ${APP}"
