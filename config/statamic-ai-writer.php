<?php

return [

    /*
    |--------------------------------------------------------------------------
    | OpenAI Compatible API Key
    |--------------------------------------------------------------------------
    |
    | The API key for your OpenAI or OpenAI-compatible service (e.g., Opper AI,
    | OpenRouter, Ollama, Groq, Azure OpenAI, etc.).
    |
    */
    'api_key' => env('OPEN_AI_API_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL for the OpenAI-compatible endpoint. Defaults to the official
    | OpenAI API URL. Supports OpenAI-compatible proxies and services such as
    | Opper (https://api.opper.ai/v3/compat) or local Ollama instances.
    |
    */
    'base_url' => env('OPEN_AI_BASE_URL', 'https://api.openai.com/v1'),

    /*
    |--------------------------------------------------------------------------
    | Model
    |--------------------------------------------------------------------------
    |
    | The model name to be used for text manipulation, translation,
    | summarization, and classification tasks.
    |
    */
    'model' => env('OPEN_AI_MODEL', 'gpt-4o-mini'),

    /*
    |--------------------------------------------------------------------------
    | Request Settings
    |--------------------------------------------------------------------------
    |
    | Default parameters sent with each chat completion request.
    |
    */
    'temperature' => (float) env('STATAMIC_AI_TEMPERATURE', 0.7),
    'max_tokens' => (int) env('STATAMIC_AI_MAX_TOKENS', 2500),
    'timeout' => (int) env('STATAMIC_AI_TIMEOUT', 60),

    /*
    |--------------------------------------------------------------------------
    | Default & Supported Languages
    |--------------------------------------------------------------------------
    |
    | Target languages available for the Content Translation feature.
    |
    */
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

    /*
    |--------------------------------------------------------------------------
    | Content Classification
    |--------------------------------------------------------------------------
    |
    | Settings for tag and category recommendations.
    |
    */
    'classification' => [
        'max_tags' => 6,
        'max_categories' => 3,
        'taxonomies' => ['tags', 'categories', 'topics'],
    ],

];
