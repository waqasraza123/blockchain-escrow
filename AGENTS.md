# blockchain-escrow

Read `docs/project-state.md` before making implementation decisions.
Read `docs/_local/current-session.md` if it exists before starting work.

## Memory Model

- `docs/project-state.md` is durable repo memory. Keep it committed.
- `docs/_local/current-session.md` is local working memory. Keep it uncommitted.
- Update `docs/project-state.md` only when long-term architecture, roadmap, constraints, or important decisions change.
- Update `docs/_local/current-session.md` at the end of every meaningful task.
- Never store secrets in either file.
- Keep both files concise and useful.
- Prefer exact next steps, constraints, changed files, and verification commands over long prose.
- Avoid noisy or speculative notes.

## Repo Rules

- Follow the existing repo architecture and conventions in `docs/product/*`.
- Implement one release boundary at a time.
- Chain is the custody truth. Database is the operational truth.
- The API must not write normalized chain projections directly.
- Workers own side effects. The indexer owns normalized chain projections.
- Keep the contract surface small and avoid fake escrow or money-movement behavior.
- Use small focused modules and production-grade structure.

## Verification

- Run the smallest relevant package command first, then broader checks.
- Do not claim green unless a command actually passed.
