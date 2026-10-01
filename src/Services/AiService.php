<?php

namespace MuenchDev\StatamicAiWriter\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AiService
{
    protected ?string $apiKey;
    protected string $baseUrl;
    protected string $model;
    protected float $temperature;
    protected int $maxTokens;
    protected int $timeout;

    public function __construct(
        ?string $apiKey = null,
        ?string $baseUrl = null,
        ?string $model = null,
        ?float $temperature = null,
        ?int $maxTokens = null,
        ?int $timeout = null
    ) {
        $this->apiKey = $apiKey
            ?? config('statamic-ai-writer.api_key')
            ?: (config('ai-writer.api_key') ?: env('OPEN_AI_API_KEY'));

        $this->baseUrl = $baseUrl
            ?? config('statamic-ai-writer.base_url')
            ?: (config('ai-writer.base_url') ?: env('OPEN_AI_BASE_URL', 'https://api.openai.com/v1'));

        $this->model = $model
            ?? config('statamic-ai-writer.model')
            ?: (config('ai-writer.model') ?: env('OPEN_AI_MODEL', 'gpt-4o-mini'));

        $this->temperature = $temperature
            ?? (float) (config('statamic-ai-writer.temperature') ?: config('ai-writer.temperature', 0.7));

        $this->maxTokens = $maxTokens
            ?? (int) (config('statamic-ai-writer.max_tokens') ?: config('ai-writer.max_tokens', 2500));

        $this->timeout = $timeout
            ?? (int) (config('statamic-ai-writer.timeout') ?: config('ai-writer.timeout', 60));
    }

    /**
     * Resize or rephrase content: shorten, expand, or rephrase.
     */
    public function resize(string $text, string $mode, ?string $instructions = null): string
    {
        $systemPrompt = match ($mode) {
            'shorten' => "You are an expert editor. Your task is to shorten the user's text while preserving its core meaning, key facts, tone, and any Markdown/HTML tags. Make it concise, punchy, and eliminate fluff.",
            'expand' => "You are an expert editor and writer. Your task is to expand the user's text with helpful details, elaboration, clarity, and depth, while maintaining the same tone, style, and formatting.",
            'rephrase' => "You are an expert editor. Your task is to rewrite/rephrase the user's text to improve clarity, flow, readability, and elegance without significantly changing its length or core message. Preserve Markdown/HTML tags.",
            default => "You are an expert editor. Edit the following text according to instructions.",
        };

        if ($instructions) {
            $systemPrompt .= " Additional instruction: {$instructions}";
        }

        $systemPrompt .= " IMPORTANT: Return ONLY the revised text. Do NOT include markdown code fences (unless original text had them), introduction, or explanations.";

        return $this->chat([
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $text],
        ]);
    }

    /**
     * Summarize long-form content into digestible overviews.
     */
    public function summarize(string $text, string $format = 'bullets'): string
    {
        $systemPrompt = match ($format) {
            'bullets' => "You are an expert content summarizer. Summarize the provided text into 3 to 5 clear, digestible bullet points highlighting key takeaways. Format each point with a markdown bullet (*).",
            'paragraph' => "You are an expert content summarizer. Summarize the provided text into a single cohesive, digestible overview paragraph (approx. 2-4 sentences).",
            'tldr' => "You are an expert content summarizer. Provide a single punchy, one-sentence TL;DR summary of the provided text.",
            default => "You are an expert content summarizer. Summarize the provided text into a clear, digestible overview.",
        };

        $systemPrompt .= " Return ONLY the summary without introductory pleasantries.";

        return $this->chat([
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $text],
        ]);
    }

    /**
     * Translate paragraph, heading, or title into selected language.
     */
    public function translate(string $text, string $targetLanguage, bool $isTitle = false): string
    {
        if ($isTitle) {
            $systemPrompt = "You are a professional translator and copywriter. Translate the following post title/heading into {$targetLanguage}. Keep it captivating, accurate, and natural. Return ONLY the translated title. Do not wrap in quotes or add a trailing period unless the original had one.";
        } else {
            $systemPrompt = "You are a professional translator. Translate the provided text into {$targetLanguage}. Preserve all HTML tags, Markdown links, formatting, bold/italics, and code blocks exactly as they are. Return ONLY the translated content without any commentary.";
        }

        return $this->chat([
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $text],
        ]);
    }

    /**
     * Classify content into suggested tags and categories.
     *
     * @param string $content
     * @param array<string, array<string>> $existingTaxonomies
     * @return array{tags: string[], categories: string[]}
     */
    public function classify(string $content, array $existingTaxonomies = []): array
    {
        $existingInfo = '';
        if (! empty($existingTaxonomies)) {
            $existingInfo .= " The site has existing taxonomy terms:";
            foreach ($existingTaxonomies as $taxonomy => $terms) {
                if (! empty($terms)) {
                    $existingInfo .= " [{$taxonomy}: " . implode(', ', array_slice($terms, 0, 30)) . "]";
                }
            }
            $existingInfo .= " Prefer using suitable existing terms when relevant, but also feel free to suggest new relevant terms.";
        }

        $maxTags = config('ai-writer.classification.max_tags', 6);
        $maxCategories = config('ai-writer.classification.max_categories', 3);

        $systemPrompt = "You are a content classification expert for a modern CMS. Analyze the provided content and suggest the most relevant tags and categories.{$existingInfo} You MUST return ONLY a valid JSON object with exactly two keys: 'tags' (array of {$maxTags} concise lowercase keyword strings) and 'categories' (array of {$maxCategories} high-level category strings). Do NOT wrap in markdown code blocks or add any other text.";

        $rawResponse = $this->chat([
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => Str::limit($content, 4000)],
        ], [
            'temperature' => 0.3,
        ]);

        return $this->parseJsonClassification($rawResponse);
    }

    /**
     * Freeform custom prompt on selected text.
     */
    public function customPrompt(string $text, string $prompt): string
    {
        $systemPrompt = "You are an expert AI writing assistant in a content management system. Follow the user's specific instruction to transform or refine the provided text. Maintain the format and styling unless requested otherwise. Return ONLY the edited text without introductory or concluding conversational filler.";

        return $this->chat([
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => "Instruction: {$prompt}\n\nText:\n{$text}"],
        ]);
    }

    /**
     * Send chat completion request to the OpenAI-compatible endpoint.
     *
     * @param array<int, array{role: string, content: string}> $messages
     * @param array<string, mixed> $overrides
     * @return string
     * @throws Exception
     */
    public function chat(array $messages, array $overrides = []): string
    {
        if (empty($this->apiKey)) {
            throw new Exception('OpenAI API Key is missing. Please set OPEN_AI_API_KEY in your .env file or publish the ai-writer config.');
        }

        $url = $this->resolveChatCompletionsUrl();

        $payload = array_merge([
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => $this->temperature,
            'max_tokens' => $this->maxTokens,
        ], $overrides);

        $response = Http::withToken($this->apiKey)
            ->timeout($this->timeout)
            ->withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])
            ->post($url, $payload);

        if ($response->failed()) {
            $errorMessage = $response->json('error.message')
                ?? $response->json('message')
                ?? $response->body()
                ?? 'Unknown API error';

            throw new Exception("AI Provider Error (HTTP {$response->status()}): {$errorMessage}");
        }

        $content = $response->json('choices.0.message.content');

        if ($content === null) {
            throw new Exception('No content was returned by the AI provider.');
        }

        return trim($content);
    }

    /**
     * Resolve the chat completions endpoint URL from the base URL.
     */
    public function resolveChatCompletionsUrl(): string
    {
        $base = rtrim($this->baseUrl, '/');

        if (Str::endsWith($base, '/chat/completions')) {
            return $base;
        }

        return "{$base}/chat/completions";
    }

    /**
     * Safely parse JSON classification response.
     *
     * @param string $raw
     * @return array{tags: string[], categories: string[]}
     */
    protected function parseJsonClassification(string $raw): array
    {
        $clean = trim($raw);

        // Strip markdown backticks if present (e.g. ```json ... ```)
        if (Str::startsWith($clean, '```')) {
            $clean = preg_replace('/^```(?:json)?\s*/i', '', $clean);
            $clean = preg_replace('/\s*```$/', '', $clean);
            $clean = trim($clean);
        }

        $decoded = json_decode($clean, true);

        if (! is_array($decoded)) {
            // Fallback: extract JSON with regex
            if (preg_match('/\{[\s\S]*\}/', $raw, $matches)) {
                $decoded = json_decode($matches[0], true);
            }
        }

        $tags = is_array($decoded['tags'] ?? null)
            ? array_values(array_filter($decoded['tags'], fn($t) => is_string($t) && ! empty(trim($t))))
            : [];

        $categories = is_array($decoded['categories'] ?? null)
            ? array_values(array_filter($decoded['categories'], fn($c) => is_string($c) && ! empty(trim($c))))
            : [];

        return [
            'tags' => array_map(fn($t) => strtolower(trim($t)), $tags),
            'categories' => array_map(fn($c) => trim($c), $categories),
        ];
    }

    public function getModel(): string
    {
        return $this->model;
    }

    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }
}
