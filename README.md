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

> AI-powered writing assistant for Statamic: modify, shorten, expand, rephrase, translate, summarize, and classify content directly within the text editor.

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
  - One-click copy or batch apply.
- **💬 Custom Prompts**:
  - Direct AI instructions on selected text (e.g. "Fix spelling and grammar", "Convert to a Markdown table", "Make tone humorous").
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
php artisan vendor:publish --tag="statamic-ai-writer" --force
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
- Choose your action (**Resize**, **Summarize**, **Translate**, **Classify**, or **Custom**).
- Review the generated result in the editable preview pane.
- Click **Replace Selection** or **Insert Below** to insert the modified text back into Bard.

### 2. In Markdown / Text Fields
- Highlight any text in the editor.
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

## Testing

Run tests inside the addon directory:

```bash
composer test
```

Or using PHPUnit:

```bash
./vendor/bin/phpunit
```

---

## License

The MIT License (MIT). Please see [License File](LICENSE) for more information.
