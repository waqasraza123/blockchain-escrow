#!/usr/bin/env bash

set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
mode="manual"
remote_name=""
remote_url=""

for arg in "$@"; do
  case "$arg" in
    --mode=*)
      mode="${arg#--mode=}"
      ;;
    --remote-name=*)
      remote_name="${arg#--remote-name=}"
      ;;
    --remote-url=*)
      remote_url="${arg#--remote-url=}"
      ;;
    *)
      echo "verify-push: unsupported argument: ${arg}" >&2
      exit 1
      ;;
  esac
done

cd "${repo_root}"

echo "verify-push: running pnpm build"

if [[ -n "${remote_name}" ]]; then
  echo "verify-push: remote=${remote_name}"
fi

if [[ -n "${remote_url}" ]]; then
  echo "verify-push: url=${remote_url}"
fi

pnpm build

echo "verify-push: build passed"

if [[ "${mode}" == "hook" ]]; then
  echo "verify-push: pre-push hook allows push"
fi
