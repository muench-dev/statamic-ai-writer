# AI Writer package instructions

## Scope and structure

This directory is the independent Git repository for `muench-dev/statamic-ai-writer`. Run Git commands here, not in the parent site's repository. Keep changes scoped to the package unless the user also requests host-site changes.

The next release is **v2.0.0**, targeting **Statamic 6** and **PHP 8.3+**. Do not reintroduce Statamic 5 compatibility. Composer uses Git tags for release versions; do not add a hard-coded `version` to `composer.json`.

- `src/ServiceProvider.php`: native Statamic extension registration and CP script data.
- `routes/cp.php` and `src/Http/Controllers/`: authenticated AI endpoints.
- `src/Services/`: OpenAI-compatible provider requests.
- `src/Actions/`, `src/Jobs/`, `src/Listeners/`: asset alt-text generation.
- `config/statamic-ai-writer.php`: the only add-on configuration namespace.
- `resources/js/` and `resources/css/`: frontend sources.
- `dist/js/` and `dist/css/`: tracked assets shipped to customers.
- `resources/artwork/`: original Marketplace SVG and PNG artwork.
- `tests/`: isolated Testbench/PHPUnit and Node regression tests.

## Development commands

All PHP, Composer, and Node commands run inside the parent site's DDEV web container. From the host-site root:

```bash
ddev composer --working-dir=addons/statamic-ai-writer install
ddev exec --dir=/var/www/html/addons/statamic-ai-writer npm ci
ddev exec --dir=/var/www/html/addons/statamic-ai-writer npm run verify
ddev exec --dir=/var/www/html/addons/statamic-ai-writer npm run build
```

`npm run verify` runs Composer validation, the PHP test suite, and the JavaScript test suite. The PHP test stack is Testbench 10 / PHPUnit 12. Release tooling requires a Node version matching `package.json`'s engines; DDEV's Node 24.15+ is suitable.

If the host site provides Laravel Pint, run it scoped to changed PHP files. Do not format the parent site or unrelated files.

After changing frontend sources, rebuild and include both source and distributed files in the same change. No frontend dependency installation is needed to execute the simple copy build, but release tooling requires `npm ci`. Track `package-lock.json`; the library's local `composer.lock`, `vendor/`, and `node_modules/` remain ignored.

The release tools currently need patched `basic-ftp` and `undici` dependency overrides because release-it pins older vulnerable versions. Keep the overrides until upstream resolves patched versions, and verify changes with `npm audit` and a release dry run.

## Implementation rules

- Use supported Statamic extension points; never patch Statamic core.
- Require **Use AI Writer** on every CP route. Hide unauthorized editor integrations and check per-asset edit permission on asset actions and authenticated upload automation.
- Limit taxonomy context to configured handles and sites/terms the current user may view.
- Use only the `statamic-ai-writer` configuration namespace. Keep environment-variable reads in the config file so configuration caching works.
- Treat provider output as untrusted. Escape previews, preserve editor state, and ignore late responses from closed or replaced sessions.
- Keep modal keyboard handling active for its lifetime; contain focus, preserve it across redraws, and restore it when closing. Check result actions at 320px and 375px viewport widths.
- Preserve existing alt fields unless overwrite was explicitly selected. Count fields as generated only after persistence succeeds. Provider failures, empty descriptions, thrown save errors, and `save() === false` must be reported as failures.
- Keep tests isolated and mock provider HTTP calls. Do not spend real AI credits or modify production content to validate a change.
- Document feature/configuration changes briefly in `README.md` and add curated release notes under `## [Unreleased]` in `CHANGELOG.md`.
- Preserve MIT, Lucide ISC, and Feather MIT notices in `LICENSE`. The original Marketplace artwork is distinct from the third-party inline UI icons.

## Marketplace review

The official review skill lives at `.agents/skills/marketplace-review/SKILL.md`. Use it when asked to review the package for submission. Compare against the current public submission guidelines, identify the exact commit/tag, report concrete findings and verification limits, and distinguish confirmed defects from unverified behavior. Review alone does not authorize fixes, commits, publication, or submission.

## Release process

### 1. Prepare the release

Only commit, push, tag, or publish when the user explicitly requests that operation. A request to configure or dry-run releases does not authorize a real release. Never force-push, overwrite an existing tag, or bypass hooks/checks.

1. Inspect package Git status, the complete diff, recent commits, and remote tracking. Preserve unrelated or user-authored work.
2. Choose a semantic version. Dropping Statamic 5/PHP 8.2 is breaking, so the next release is **v2.0.0**. Use patch/minor increments only for subsequent compatible changes.
3. Keep `CHANGELOG.md` in Keep a Changelog format: `## [Unreleased]` followed by bracketed version headings in descending order, with curated Added/Changed/Fixed/Removed sections. The release-it plugin uses these entries as release notes.
4. Update compatibility, installation, configuration, external-provider disclosures, and upgrade notes in the README. When manually finalizing a release section, synchronize `package.json` and `package-lock.json` with that version using `npm version X.Y.Z --no-git-tag-version` inside DDEV. Do not add a version to `composer.json`.
5. Install dependencies, run `npm run verify`, and rebuild assets using the DDEV commands above. Inspect the generated `dist` diff and commit intended preparation changes, including `package-lock.json`.
6. Start the release from a clean, up-to-date `main` branch tracking `origin/main`. Ensure Git fetch/push authentication is available inside DDEV and `GITHUB_TOKEN` is supplied to the container environment with repository release permissions. Never commit credentials or place them in tracked DDEV configuration.

### 2. Preview and release with release-it

Version metadata and the dated v2.0.0 changelog section are already prepared. From the host-site root, preview that exact version without incrementing it again:

```bash
ddev exec --dir=/var/www/html/addons/statamic-ai-writer npm run release -- --no-increment --dry-run
```

A dry run previews hooks and release actions; it does not execute validation hooks or write version/changelog files, create commits/tags, push, or publish. Run `npm run verify` separately. With no GitHub token, use `--no-github.release` for a local preview; this does not validate GitHub release authentication. Do not disable the clean-tree or branch checks for a real release.

When the user explicitly authorizes publication:

```bash
ddev exec --dir=/var/www/html/addons/statamic-ai-writer npm run release -- --no-increment
```

For later releases, add notes under Unreleased and use the approved increment, e.g. `npm run release -- patch`, `minor`, or `major`. Use `--no-increment` only when version metadata and a matching dated changelog section have both already been finalized. `.release-it.json`:

- Uses the synchronized package metadata as the current/prepared version; Composer still obtains its distributed version from Git tags.
- Requires `main`, an upstream, and a clean working tree.
- Rebuilds assets and rejects an uncommitted `dist` difference, then validates Composer and both test suites.
- Normally bumps `package.json` and `package-lock.json`, dates/releases the curated changelog, and opens a fresh Unreleased section. With `--no-increment`, it uses the already prepared version and release notes instead.
- Creates `chore: release vX.Y.Z`, an annotated `vX.Y.Z` tag, pushes to the remote, and creates a GitHub release using the changelog notes.
- Never publishes to npm. The package is distributed through Composer/Packagist.

If a release fails, inspect which steps actually completed before retrying. Do not assume that a failed GitHub release means the commit/tag was not pushed. Use `gh` to inspect GitHub tags/releases/checks and recover only the missing step; do not create duplicate releases or move published tags.

### 3. Verify and submit

1. Confirm the release commit/tag on GitHub and the expected GitHub release using `gh`.
2. Verify that Packagist recognizes the new tag; if its existing GitHub integration has not synchronized, trigger an authorized Packagist update. Do not assume that creating a GitHub release proves Composer availability.
3. Install the exact released version in an isolated fresh Statamic 6 site following the README. Verify auto-discovery, config/asset publishing, editor integrations, permissions with a non-super user, and alt-text success/skip/error states using mocked provider responses where practical.
4. Check the submitted listing/screenshots against the tagged artifact and its declared PHP/Statamic versions. Run the Marketplace review skill and address confirmed findings.
5. Resubmit the new tagged release through the Statamic Marketplace only when the user requests submission. Return the commit/tag/release URL and describe validation performed and any remaining limits.
