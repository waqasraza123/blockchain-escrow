# Contributing

## Safe Push Workflow

This repo uses a versioned Git pre-push hook in `.githooks/pre-push`.

Normal `git push` is blocked when `pnpm build` fails.

### One-time setup

Run:

```bash
pnpm setup:githooks
```

This sets local Git config `core.hooksPath` to `.githooks`.

### Verify before pushing

Run:

```bash
pnpm verify:push
```

This executes the shared verifier in `scripts/verify-push.sh`, which currently runs `pnpm build`.

### AI-friendly push command

Run:

```bash
pnpm safe-push -- <git-push-args>
```

Examples:

```bash
pnpm safe-push
pnpm safe-push -- origin main
pnpm safe-push -- origin HEAD
```

`pnpm safe-push` runs the same verification first and only executes `git push` if verification passes.

### Hook files

- `.githooks/pre-push`: versioned Git hook entrypoint
- `scripts/setup-githooks.sh`: installs the repo hook path in the current clone
- `scripts/verify-push.sh`: shared verifier used by both the hook and `pnpm safe-push`
- `scripts/safe-push.sh`: wrapper that verifies, then runs `git push`
