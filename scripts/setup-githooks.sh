#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"

cd "${repo_root}"

chmod +x .githooks/pre-push scripts/verify-push.sh scripts/safe-push.sh scripts/setup-githooks.sh
git config --local core.hooksPath .githooks

echo "setup-githooks: configured core.hooksPath=.githooks"
