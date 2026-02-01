# AGENTS.md - Project Instructions for AI Assistants

## Project Overview
Network Monitor is a Windows desktop GUI app that monitors internet connectivity and resets the active network adapter on disconnect. The UI is built with React + TypeScript; privileged operations should be handled by a local agent/service (not implemented yet).

## Tech Stack
- **Language:** TypeScript
- **Framework:** React
- **Runtime:** Node.js 20
- **Package Manager:** npm
- **Build Tool:** Vite
- **Database:** None

## Project Structure
```
.github/
  workflows/
docs/
  adr/
src/
  utils/
tests/
```

Key directories:
- `src/` — React UI code
- `src/utils/` — Shared utilities (e.g., logging)
- `tests/` — Vitest tests
- `docs/` — Architecture, API/IPC, and ADRs

## Commands

### Development
```powershell
npm install
npm run dev
```

### Quality Gates
```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## Conventions

### Code Style
- **Linter:** ESLint (`eslint.config.js`, flat config)
- **Formatter:** Prettier (`.prettierrc`)

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test changes
- `chore:` Maintenance

### Branch Naming
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates

## Testing
- **Framework:** Vitest
- **Location:** `tests/`
- **Run:** `npm run test`

## Documentation
- `README.md`
- `docs/architecture.md`
- `docs/api.md`
- `docs/adr/README.md`
- `CHANGELOG.md`

Update `CHANGELOG.md` for all meaningful changes and `README.md` for user-facing updates.

## Version Management
- **Version Source:** `VERSION` (canonical), `package.json`
- **Current Version:** 0.1.0
- Follow SemVer (MAJOR.MINOR.PATCH) and keep version fields in sync.

## Environment Variables
See `.env.example` for required variables. Current keys:
- `NODE_ENV`
- `PORT`
- `LOG_LEVEL`
- `RESET_COMMAND` (optional, for privileged adapter reset)

## Logging
- Structured JSON logger: `src/utils/logger.ts`

## Important Notes
- Network adapter reset requires elevated privileges on Windows.
- The UI must not execute privileged operations directly.
- Local agent/service boundary is planned but not implemented yet.

---

## Global Policies (LeftHandVoodoo)

This project follows LeftHandVoodoo global policies. Key points:

1. **Definition of Done:** Changes are not complete until tests, changelog, and docs are updated.
2. **Versioning:** Semantic versioning is enforced. Keep version fields in sync.
3. **Changelog:** All meaningful changes must be recorded in CHANGELOG.md.
4. **Tests:** Required for all non-trivial work. Run tests before committing.
5. **Small commits:** Keep commits focused and reviewable.

For full policy details, see the global `~/.codex/AGENTS.md`.
