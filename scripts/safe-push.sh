#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"

cd "${repo_root}"

if [[ "${1:-}" == "--" ]]; then
  shift
fi

"${repo_root}/scripts/verify-push.sh" --mode=manual

echo "safe-push: pushing with git push $*"

SAFE_PUSH_VERIFIED=1 git push "$@"
