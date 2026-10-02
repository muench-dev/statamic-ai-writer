# Changelog

All notable changes to Statamic AI Writer are documented here.

## [Unreleased]

### Fixed

- Restore the AI Assistant's Bard button, Markdown/Textarea quick actions, and floating selection trigger on the first Statamic 6 Control Panel load. Read server-provided permissions before `Statamic.config()` runs, while preserving permission checks for unauthorized users.

### Added

- Startup regression coverage for both source and distributed JavaScript, including delayed configuration, missing permissions, initialized-config precedence, and settings loading after the HTTP client boots.

## [2.0.0] - 2026-10-02

### Changed

- Require Statamic 6 and PHP 8.3+; drop Statamic 5 and PHP 8.2 compatibility.
- Standardize the development test stack on Testbench 10 and PHPUnit 12.

### Added

- Original Marketplace artwork with a pen nib, AI sparkle, and writing lines, provided as an editable SVG and a 1024 × 1024 PNG.
- Setup guidance when no API key is configured.
- Regression tests for non-super-user permissions, taxonomy visibility, classification limits, and alt-text outcomes.
- A `composer test` command for the PHP test suite.
- Documentation for alt-text generation, multilingual asset fields, queues, provider data transfers, and upgrading from v1.2.0.
- Lucide ISC and Feather MIT copyright and license notices for inline UI icons.
- A release-it workflow with curated changelog updates, pre-release checks, Git tags, and GitHub releases; npm publishing is disabled.
- Package-specific development and release instructions in `AGENTS.md`.

### Fixed

- Ignore late responses from closed or replaced assistant sessions, including follow-up title translations, and prevent duplicate in-flight requests.
- Keep Escape dismissal active, contain keyboard focus in the assistant, preserve focus across redraws, and restore focus when closing.
- Keep result actions visible and usable on narrow screens.
- Report cancelled asset saves as failures instead of successfully generated alt text.
- Enforce **Use AI Writer** on every Control Panel endpoint and hide editor integrations from unauthorized users.
- Limit existing taxonomy context to configured handles, visible taxonomies, and accessible site localizations.
- Require **Use AI Writer** and per-asset edit access for alt-text actions and authenticated upload automation.
- Report generated, skipped, and failed alt-text counts accurately on synchronous queues instead of reporting success after provider failures.
- Surface queued alt-text failures for retries, reject empty provider responses, and preserve successfully generated language fields during partial failures.
- Read classification and other settings consistently from the published `statamic-ai-writer` configuration and cap classification results to the configured limits.
- Respect the alt-text enabled setting for upload automation.
- Correct the feature description to explain that taxonomy suggestions can be copied and assigned manually.

### Removed

- The unused duplicate `config/ai-writer.php` file and reads from its configuration namespace. See the README's upgrade instructions for migrating custom settings.

## [1.2.0]

### Added

- AI Assistant quick actions for Markdown and Textarea fields, using the current selection or the whole field when no text is selected.

### Fixed

- Fetch dialog settings after Statamic boots its HTTP client.

## [1.1.0]

### Added

- AI-generated title suggestions with balanced, professional, casual, and creative tones.
- Copy headline suggestions or apply them to the post title in the publish form.

## [1.0.0]

### Added

- Initial writing assistant with resizing, summarization, translation, classification, and custom prompts.
- Image alt-text generation via asset actions and optional upload automation.

[Unreleased]: https://github.com/muench-dev/statamic-ai-writer/compare/v2.0.0...main
[2.0.0]: https://github.com/muench-dev/statamic-ai-writer/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/muench-dev/statamic-ai-writer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/muench-dev/statamic-ai-writer/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/muench-dev/statamic-ai-writer/releases/tag/v1.0.0
