# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add Testing Library + jest-dom setup with a baseline UI test.
- Add agent TypeScript tooling config and scripts.
- Add adapter parsing utilities and PowerShell runner.
- Add coverage for listAdapters error propagation.

### Changed

- Add `jsdom` dev dependency to support Vitest's jsdom environment.
- Align `@types/node` to Node 20.

### Fixed

- Add a minimal agent entrypoint so `tsconfig.agent.json` has inputs.
- Use the Vitest-specific jest-dom setup import.
- Harden PowerShell adapter parsing for invalid payloads and add coverage.
- Fail fast on PowerShell adapter query errors.
- Decode UTF-16LE PowerShell output (strip BOM) and hide the console window.

### Removed

## [0.1.0] - 2026-02-01

### Added
- Initial project scaffolding.
