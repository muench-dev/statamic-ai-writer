<!-- statamic:hide -->
<h1 align="center">
  Statamic AI Writer
</h1>
<!-- /statamic:hide -->

<p align="center">
  <a href="https://statamic.com" style="text-decoration: none">
    <img src="https://img.shields.io/badge/Statamic-5.0%2B%20%7C%206.0%2B-FF269E?style=flat-square" alt="Statamic 5 & 6" />
  </a>
  <a href="https://packagist.org/packages/muench-dev/statamic-ai-writer" style="text-decoration: none">
    <img src="https://img.shields.io/packagist/v/muench-dev/statamic-ai-writer?style=flat-square&label=Release" alt="Latest Version" />
  </a>
  <a href="https://github.com/muench-dev/statamic-ai-writer/blob/main/LICENSE" style="text-decoration: none">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License" />
  </a>
</p>

> AI-powered writing assistant for Statamic: modify, shorten, expand, rephrase, translate, summarize, classify content, and generate post titles directly within the text editor.

Statamic AI Writer integrates seamlessly with your editor experience (Bard, Markdown, and text areas). Select or mark any text to refine it with AI, generate executive summaries, translate sections (and optionally post titles), or receive automated taxonomy recommendations.

---

## Features

- **⚡ Content Resizing**:
  - **Shorten**: Condense long sentences and eliminate fluff while preserving key facts and HTML/Markdown structure.
  - **Expand**: Elaborate on ideas and add thorough explanations and depth.
  - **Rephrase**: Polish tone, readability, and stylistic flow without changing content length.
- **📝 Content Summarization**:
  - Digest long-form content into clear bullet-point takeaways.
  - Generate single-paragraph overviews.
  - Produce one-line TL;DR summaries.
- **🌐 Content Translation**:
  - Translate paragraphs, headings, and blocks into any selected language.
  - Preserves markdown links, HTML markup, and formatting intact.
  - Optional **Post Title Translation**: Update the post title input in the publish form alongside content translation.
- **🏷️ Content Classification**:
  - AI analyzes your content and suggests relevant tags and categories.
  - Recommends existing taxonomy terms when available and discovers new topics.
   - Copy individual suggestions or all tags; assign them to taxonomy fields manually.
- **💬 Custom Prompts**:
  - Direct AI instructions on selected text (e.g. "Fix spelling and grammar", "Convert to a Markdown table", "Make tone humorous").
- **✨ Title Generation**:
  - Generate up to five headline suggestions with a single click on **Title Generation** in the assistant.
  - Brainstorm balanced, professional, casual, or creative titles in the content's language.
   - Copy individual suggestions or apply one to the post title without changing the body.
- **🖼️ Image Alt Text**:
  - Generate alt text from the asset manager, individually or in bulk.
  - Optional generation on upload, with language-specific fields for multilingual sites.
  - Preserve existing descriptions by default, with an explicit overwrite option.
- **🔌 OpenAI Compatible**:
  - Connects to official OpenAI, Opper AI, OpenRouter, local Ollama, Groq, or any OpenAI-compatible API endpoint.
- **✨ Seamless UX**:
  - Native **Bard Toolbar Button**.
  - **Floating Selection Pill** that appears when highlighting text in Bard or Markdown editors.
  - Real-time comparison preview before applying changes (Replace Selection, Insert Below, or Copy).

---

## Installation

Install the addon via Composer:

```bash
composer require muench-dev/statamic-ai-writer
```

Publish the assets and configuration file:

```bash
php artisan vendor:publish --tag="statamic-ai-writer"
php artisan vendor:publish --tag="statamic-ai-writer-config"
```

---

## Configuration

Add your API credentials to your application's `.env` file:

```env
OPEN_AI_API_KEY=your_api_key_here
OPEN_AI_BASE_URL=https://api.openai.com/v1
OPEN_AI_MODEL=gpt-4o-mini
```

The assistant shows setup guidance until an API key is configured. After changing cached configuration, run `php artisan config:clear`. For non-super users, grant **Use AI Writer** to their role in the Control Panel. All assistant endpoints enforce this permission. Asset alt-text generation also requires **edit** permission for the asset's container; view-only access is insufficient. Taxonomy context is limited to configured taxonomies the user can view.

### External requests and costs

AI Writer sends the selected text, instructions, and relevant existing taxonomy terms to the configured provider. Title generation sends the available post content and current title. Translation can also send the post title. Alt-text generation sends the image's full contents as a base64-encoded image, once per language requiring a description. The `image_detail` option affects provider processing, not the amount of image data uploaded. Review your provider's data-retention and privacy terms before using private content or images. Provider credentials and any usage fees are supplied and paid by the site owner; no AI service subscription is included with this add-on. Image generation requires a vision-capable model and endpoint.

### Compatible Providers

Because AI Writer supports any OpenAI-compatible endpoint, you can easily point it to alternative providers:

#### Opper AI
```env
OPEN_AI_API_KEY=op-xxxxxxxxxxxxxxxxxxxx
OPEN_AI_BASE_URL=https://api.opper.ai/v3/compat
OPEN_AI_MODEL=gpt-6-luna
```

#### OpenRouter
```env
OPEN_AI_API_KEY=sk-or-v1-xxxxxxxxxxxx
OPEN_AI_BASE_URL=https://openrouter.ai/api/v1
OPEN_AI_MODEL=anthropic/claude-3.5-sonnet
```

#### Local Ollama
```env
OPEN_AI_API_KEY=ollama
OPEN_AI_BASE_URL=http://localhost:11434/v1
OPEN_AI_MODEL=llama3.2
```

### Advanced Settings

You can customize defaults in `config/statamic-ai-writer.php`:

`classification.max_tags` and `max_categories` cap the returned suggestions. `classification.taxonomies` is an allowlist of handles used for existing-term context and the settings response; an empty array disables existing-term context. These options do not automatically apply suggestions or create terms.

```php
return [
    'api_key' => env('OPEN_AI_API_KEY'),
    'base_url' => env('OPEN_AI_BASE_URL', 'https://api.openai.com/v1'),
    'model' => env('OPEN_AI_MODEL', 'gpt-4o-mini'),

    'temperature' => (float) env('STATAMIC_AI_TEMPERATURE', 0.7),
    'max_tokens' => (int) env('STATAMIC_AI_MAX_TOKENS', 2500),
    'timeout' => (int) env('STATAMIC_AI_TIMEOUT', 60),

    'default_language' => env('STATAMIC_AI_DEFAULT_LANG', 'de'),

    'supported_languages' => [
        'de' => 'German (Deutsch)',
        'en' => 'English',
        'fr' => 'French (Français)',
        'es' => 'Spanish (Español)',
        'it' => 'Italian (Italiano)',
        'nl' => 'Dutch (Nederlands)',
        'pt' => 'Portuguese (Português)',
        'pl' => 'Polish (Polski)',
        'sv' => 'Swedish (Svenska)',
        'ja' => 'Japanese (日本語)',
        'zh' => 'Chinese (中文)',
    ],

    'classification' => [
        'max_tags' => 6,
        'max_categories' => 3,
        'taxonomies' => ['tags', 'categories', 'topics'],
    ],
];
```

---

## How to Use

### 1. In Bard Editor
- Click the **AI Assistant** icon (✨) in the Bard toolbar, or simply highlight any text.
- If text is highlighted, the AI dialog opens with the selection preloaded.
- Choose your action (**Resize**, **Summarize**, **Translate**, **Classify**, **Title Generation**, or **Custom**).
- Review the generated result in the editable preview pane.
- Click **Replace Selection** or **Insert Below** to insert the modified text back into Bard.

### 2. In Markdown / Text Fields
- Click the **AI Assistant** quick action (✨) in the field header of any Markdown or Textarea field. The current selection is preloaded; without a selection the whole field is used, and **Replace Selection** replaces the whole field.
- Alternatively, highlight any text in the editor.
- A floating **Ask AI** pill will appear above the selection.
- Click the pill to open the assistant.
- Apply the changes directly back into the editor or copy to clipboard.

### 3. Translating Content & Post Titles
- Under the **Translation** tab, select the target language (e.g. English, German, French).
- If editing an entry, check the box **"Also translate Post Title"**.
- Clicking **Replace Selection** will both replace the translated body text and update the post's title input in the publish form.

### 4. Categorizing & Tagging
- Under the **Classification** tab, click **Analyze Content & Suggest Tags**.
- The AI will inspect the content and output suggested categories and tags.
- Click any tag badge to copy it to your clipboard, or click **Copy All Tags**.

---

### 5. Generating Post Titles
- Open the AI Assistant from Bard or a text selection, then click **Title Generation**. Suggestions are generated automatically from the full active Bard document, or the available editor content/selection.
- Select a **Headline Tone** to generate fresh suggestions, or click **Regenerate Titles** to brainstorm more headlines.
- Click **Copy** on a suggestion, or **Use Title** when a post title field is available. Applying a title updates the publish form; save the entry normally to persist it.
- Existing AI credentials and model settings are used. No blueprint changes are required. Empty content and provider errors are shown in the dialog so you can retry.

### 6. Generating Image Alt Text

In **Assets**, select one or more raster images and choose **Generate AI Alt Text**. Existing non-empty alt fields are skipped unless **Overwrite existing alt text** is enabled. SVGs and non-images are excluded. The action requires **Use AI Writer** and edit access to each asset. Setting `alt_text.enabled` to `false` disables the asset action and upload generation.

Configure automatic upload generation and the vision model in `.env`:

```env
GENERATE_ALT_TEXT_ON_UPLOAD=false
STATAMIC_AI_VISION_MODEL=gpt-4o-mini
GENERATE_ALT_TEXT_QUEUE=default
STATAMIC_AI_ALT_LANG=de
OPEN_AI_IMAGE_DETAIL=low
OPEN_AI_MAX_TOKENS=150
```

Upload generation is opt-in. When enabled, authenticated uploaders must have the same AI and asset-edit permissions. Server-side uploads without a logged-in user use the site-wide automation setting. Images are sent to the provider, including automatically on upload when this option is enabled.

The `alt_text` section of `config/statamic-ai-writer.php` controls the model, image detail, output token limit, queue name, default language, and optional `field_mapping`. By default, a site with one unique language writes `alt`; multiple site languages write `alt_{lang}`, such as `alt_en` and `alt_de`, using Statamic's site language codes. Add these text fields to the asset container's blueprint and use the matching field in your templates; the add-on does not create blueprint fields or switch template output for you. Existing fields are preserved unless overwrite is explicitly requested.

To use different field names, configure a language-to-field mapping:

```php
'field_mapping' => ['en' => 'alt', 'de' => 'alt_de'],
```

With `QUEUE_CONNECTION=sync`, generation runs immediately and reports generated, skipped, and failed alt-field counts. Missing credentials and provider failures are reported as errors, including partial failures. With an asynchronous queue, the action only confirms that work was queued; it does not claim generation succeeded. Run a worker for the configured queue, for example `php artisan queue:work --queue=default`, and inspect application logs and `php artisan queue:failed` for failures. Successful language fields are saved even if another language fails; retrying without overwrite skips those already generated.

### Updating from v1.2.0

Review role permissions: users who previously used the assistant implicitly now need **Use AI Writer**. All configuration is read from `statamic-ai-writer`; move any custom settings previously placed in `config/ai-writer.php` into `config/statamic-ai-writer.php`. The unused bundled `ai-writer.php` config has been removed. Keep your existing published configuration and merge any missing defaults rather than overwriting it. Republish the updated assets with `php artisan vendor:publish --tag="statamic-ai-writer" --force` and clear cached configuration.

## Testing

Run tests inside the addon directory:

```bash
composer install
composer test
```

Or using PHPUnit:

```bash
./vendor/bin/phpunit
```

Run the frontend title-generation checks with `npm test`, and rebuild the distributed assets with `npm run build` after changing JavaScript or CSS.

## Support

Community support and bug reports are available through [GitHub Issues](https://github.com/muench-dev/statamic-ai-writer/issues). Include your Statamic/PHP versions, queue driver, and reproduction steps; exclude API keys and private content.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and unreleased changes.

---

## License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

Inline icons are adapted from [Lucide](https://lucide.dev) (ISC), including icons derived from Feather (MIT). Their copyright and permission notices are included in [LICENSE](LICENSE).

### Marketplace artwork

The original Marketplace icon is included as an editable [SVG](resources/artwork/marketplace-icon.svg) and a [1024 × 1024 PNG](resources/artwork/marketplace-icon.png) for uploads. It uses a fountain-pen nib, an AI sparkle, and writing lines, has no external fonts or images, and is covered by this package's MIT license. This artwork is separate from the inline UI icons credited above.

![AI Writer Marketplace icon](resources/artwork/marketplace-icon.png)
