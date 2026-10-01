/**
 * Statamic AI Writer
 *
 * Powerful AI writing assistant for Statamic:
 * - Content Resizing (Shorten, Expand, Rephrase)
 * - Content Summarization (Bullets, Paragraph, TL;DR)
 * - Content Translation (Paragraphs, Headings, and Post Title)
 * - Content Classification (Tags & Categories suggestions)
 * - Title Generation (Headline suggestions with selectable tone)
 * - Custom AI instructions
 */

(function () {
    'use strict';

    const ICONS = {
        sparkles: `<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
        close: `<svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
        shorten: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9h12"/><path d="M9 15h6"/></svg>`,
        expand: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>`,
        rephrase: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
        summarize: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h7"/></svg>`,
        translate: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`,
        classify: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>`,
        copy: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
        check: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
        insert: `<svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
    };

    class StatamicAiWriterManager {
        constructor() {
            this.modalEl = null;
            this.floatingBtnEl = null;
            this.activeContext = null;
            this.settings = {
                configured: true,
                model: 'gpt-4o-mini',
                default_language: 'de',
                supported_languages: {
                    de: 'German (Deutsch)',
                    en: 'English',
                    fr: 'French (Français)',
                    es: 'Spanish (Español)',
                    it: 'Italian (Italiano)',
                    nl: 'Dutch (Nederlands)',
                },
                taxonomies: [],
            };

            this.state = {
                tab: 'resize', // resize, summarize, translate, classify, custom, titles
                subAction: 'shorten', // shorten, expand, rephrase
                summaryFormat: 'bullets', // bullets, paragraph, tldr
                targetLanguage: 'de',
                translateTitle: false,
                customPrompt: '',
                originalText: '',
                generatedText: '',
                postTitle: '',
                translatedTitle: '',
                titleSuggestions: [],
                titleTone: 'balanced',
                classificationTags: [],
                classificationCategories: [],
                loading: false,
                error: null,
            };

            this.init();
        }

        async init() {
            this.fetchSettings();
            this.setupFloatingSelectionTrigger();
            this.setupBardIntegration();
            this.setupFieldActions();
        }

        async fetchSettings() {
            try {
                const response = await this.axios().get(this.cpUrl('ai-writer/settings'));
                if (response.data) {
                    this.settings = Object.assign(this.settings, response.data);
                    this.state.targetLanguage = this.settings.default_language || 'de';
                }
            } catch (err) {
                // Keep default settings
            }
        }

        cpUrl(path) {
            if (typeof window.cp_url === 'function') {
                return window.cp_url(path);
            }
            const cpRoot = window.Statamic?.$config?.get('cpRoot') || '/cp';
            return `${cpRoot.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
        }

        axios() {
            return window.Statamic?.$app?.config?.globalProperties?.$axios || window.Statamic?.$axios || window.axios;
        }

        toast(message, type = 'success') {
            if (window.Statamic?.$toast) {
                if (type === 'error') {
                    window.Statamic.$toast.error(message);
                } else {
                    window.Statamic.$toast.success(message);
                }
            } else {
                console.log(`[AI Writer ${type}]: ${message}`);
            }
        }

        setupBardIntegration() {
            if (!window.Statamic || !window.Statamic.$bard) {
                return;
            }

            window.Statamic.$bard.buttons((buttons, button) => {
                return {
                    name: 'aiwriter',
                    text: 'AI Assistant',
                    html: ICONS.sparkles,
                    command: (editor) => {
                        this.openFromBard(editor);
                    },
                };
            });
        }

        // Markdown and textarea fields have no Bard toolbar, and CodeMirror does not
        // always expose a native DOM selection, so offer a quick field action instead.
        setupFieldActions() {
            if (!window.Statamic?.$fieldActions) {
                return;
            }

            ['markdown-fieldtype', 'textarea-fieldtype'].forEach((binding) => {
                window.Statamic.$fieldActions.add(binding, {
                    title: 'AI Assistant',
                    icon: 'ai-sparks',
                    quick: true,
                    run: (payload) => this.openFromField(payload),
                });
            });
        }

        openFromField(payload) {
            const cm = payload.vm?.codemirror || null;
            const textarea = cm ? null : payload.vm?.$el?.querySelector?.('textarea') || null;
            const value = cm ? cm.getValue() : String(payload.value ?? '');

            let start = 0;
            let end = value.length;
            if (cm && cm.somethingSelected()) {
                const { anchor, head } = cm.listSelections()[0];
                start = Math.min(cm.indexFromPos(anchor), cm.indexFromPos(head));
                end = Math.max(cm.indexFromPos(anchor), cm.indexFromPos(head));
            } else if (textarea && textarea.selectionStart !== textarea.selectionEnd) {
                start = textarea.selectionStart;
                end = textarea.selectionEnd;
            }

            // Without a selection the whole field is used and replaced.
            this.open({
                type: 'field',
                payload,
                cm,
                value,
                start,
                end,
                text: value.slice(start, end),
            });
        }

        applyToField(ctx, newText, insertBelow = false) {
            const start = insertBelow ? ctx.end : ctx.start;
            const insert = insertBelow ? "\n\n" + newText : newText;

            // Edit CodeMirror directly so its undo history and change events stay intact.
            if (ctx.cm) {
                ctx.cm.replaceRange(insert, ctx.cm.posFromIndex(start), ctx.cm.posFromIndex(ctx.end));
                return;
            }

            ctx.payload.update(ctx.value.slice(0, start) + insert + ctx.value.slice(ctx.end));
        }

        setupFloatingSelectionTrigger() {
            document.addEventListener('mouseup', (e) => this.handleSelectionChange(e));
            document.addEventListener('keyup', (e) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift'].includes(e.key)) {
                    this.handleSelectionChange(e);
                }
            });
            document.addEventListener('mousedown', (e) => {
                if (this.floatingBtnEl && !this.floatingBtnEl.contains(e.target)) {
                    this.hideFloatingButton();
                }
            });
        }

        handleSelectionChange(e) {
            if (this.modalEl) return;

            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                this.hideFloatingButton();
                return;
            }

            const text = selection.toString().trim();
            if (text.length < 3) {
                this.hideFloatingButton();
                return;
            }

            const anchorNode = selection.anchorNode;
            const editorEl = anchorNode?.nodeType === Node.ELEMENT_NODE
                ? anchorNode.closest('.bard-fieldtype, .markdown-fieldtype, [contenteditable="true"], .ProseMirror, .cm-editor, textarea')
                : anchorNode?.parentElement?.closest('.bard-fieldtype, .markdown-fieldtype, [contenteditable="true"], .ProseMirror, .cm-editor, textarea');

            if (!editorEl) {
                this.hideFloatingButton();
                return;
            }

            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (!rect || rect.width === 0) return;

            this.showFloatingButton(rect, {
                type: 'dom',
                editorEl: editorEl,
                text: text,
                range: range.cloneRange(),
            });
        }

        showFloatingButton(rect, context) {
            if (!this.floatingBtnEl) {
                this.floatingBtnEl = document.createElement('button');
                this.floatingBtnEl.className = 'statamic-ai-writer-floating-btn';
                this.floatingBtnEl.innerHTML = `${ICONS.sparkles} <span>Ask AI</span>`;
                this.floatingBtnEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.open(this.activeFloatingContext);
                    this.hideFloatingButton();
                });
                document.body.appendChild(this.floatingBtnEl);
            }

            this.activeFloatingContext = context;
            const top = rect.top + window.scrollY - 36;
            const left = Math.max(10, rect.left + window.scrollX + (rect.width / 2) - 45);

            this.floatingBtnEl.style.top = `${top}px`;
            this.floatingBtnEl.style.left = `${left}px`;
            this.floatingBtnEl.style.display = 'inline-flex';
        }

        hideFloatingButton() {
            if (this.floatingBtnEl) {
                this.floatingBtnEl.style.display = 'none';
            }
        }

        openFromBard(editor) {
            const { from, to } = editor.state.selection;
            let text = '';

            if (from !== to) {
                text = editor.state.doc.textBetween(from, to, ' ');
            } else {
                // If no selection, grab current block node
                const $pos = editor.state.selection.$from;
                const node = $pos.parent;
                if (node && node.textContent) {
                    text = node.textContent;
                } else {
                    // Fallback to full document text
                    text = editor.state.doc.textContent;
                }
            }

            this.open({
                type: 'bard',
                editor: editor,
                from: from,
                to: to,
                text: text,
            });
        }

        open(context = {}) {
            this.activeContext = context;
            this.state.originalText = context.text || '';
            this.state.generatedText = '';
            this.state.translatedTitle = '';
            this.state.titleSuggestions = [];
            this.state.error = null;
            this.state.loading = false;
            this.state.classificationTags = [];
            this.state.classificationCategories = [];

            // Detect post title on page
            const titleInput = this.getTitleInput();
            this.state.postTitle = titleInput ? titleInput.value : '';

            this.renderModal();

            // Auto-trigger classify if tab is classify
            if (this.state.tab === 'classify') {
                this.runClassification();
            } else if (this.state.tab === 'titles') {
                this.runTitleGeneration();
            }
        }

        close() {
            if (this.modalEl) {
                this.modalEl.remove();
                this.modalEl = null;
            }
        }

        renderModal() {
            this.close();

            this.modalEl = document.createElement('div');
            this.modalEl.className = 'statamic-ai-modal-overlay';
            this.modalEl.addEventListener('click', (e) => {
                if (e.target === this.modalEl) this.close();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modalEl) this.close();
            }, { once: true });

            const inputText = this.state.tab === 'titles'
                ? this.getFullEditorContent().trim() || this.state.originalText
                : this.state.originalText;
            const wordsCount = inputText.trim()
                ? inputText.trim().split(/\s+/).length
                : 0;

            const modalHtml = `
                <div class="statamic-ai-modal" role="dialog" aria-modal="true">
                    <div class="statamic-ai-header">
                        <div class="statamic-ai-title-wrap">
                            <span class="statamic-ai-icon-badge">${ICONS.sparkles}</span>
                            <h3 class="statamic-ai-title">AI Writer Assistant</h3>
                            <span class="statamic-ai-model-tag">${this.escapeHtml(this.settings.model)}</span>
                        </div>
                        <button type="button" class="statamic-ai-close-btn" data-action="close" title="Close (Esc)">
                            ${ICONS.close}
                        </button>
                    </div>

                    <div class="statamic-ai-tabs">
                        <button type="button" class="statamic-ai-tab ${this.state.tab === 'resize' ? 'active' : ''}" data-tab="resize">
                            ${ICONS.rephrase} Content Resizing
                        </button>
                        <button type="button" class="statamic-ai-tab ${this.state.tab === 'summarize' ? 'active' : ''}" data-tab="summarize">
                            ${ICONS.summarize} Summarization
                        </button>
                        <button type="button" class="statamic-ai-tab ${this.state.tab === 'translate' ? 'active' : ''}" data-tab="translate">
                            ${ICONS.translate} Translation
                        </button>
                        <button type="button" class="statamic-ai-tab ${this.state.tab === 'classify' ? 'active' : ''}" data-tab="classify">
                            ${ICONS.classify} Classification
                        </button>
                        <button type="button" class="statamic-ai-tab ${this.state.tab === 'custom' ? 'active' : ''}" data-tab="custom">
                            ${ICONS.sparkles} Custom Prompt
                        </button>
                        <button type="button" class="statamic-ai-tab ${this.state.tab === 'titles' ? 'active' : ''}" data-tab="titles">
                            ${ICONS.sparkles} Title Generation
                        </button>
                    </div>

                    <div class="statamic-ai-body">
                        ${this.renderTabContent()}

                        <div class="statamic-ai-preview-box">
                            <div class="statamic-ai-preview-header">
                                <span>Input Text (${wordsCount} words, ${inputText.length} chars)</span>
                            </div>
                            <div class="statamic-ai-preview-content">${this.escapeHtml(inputText) || '<em class="opacity-50">No text selected</em>'}</div>
                        </div>

                        ${this.renderResultArea()}
                    </div>

                    <div class="statamic-ai-footer">
                        <div class="statamic-ai-footer-left">
                            <button type="button" class="statamic-ai-btn statamic-ai-btn-secondary" data-action="close">
                                Cancel
                            </button>
                        </div>
                        <div class="statamic-ai-footer-right">
                            ${this.renderFooterActions()}
                        </div>
                    </div>
                </div>
            `;

            this.modalEl.innerHTML = modalHtml;
            document.body.appendChild(this.modalEl);

            this.bindEvents();
        }

        renderTabContent() {
            if (this.state.tab === 'titles') {
                return `
                    <div>
                        <label for="statamic-ai-title-tone" class="block text-xs font-semibold uppercase text-gray-500 mb-1">Headline Tone</label>
                        <select class="statamic-ai-select" id="statamic-ai-title-tone" ${this.state.loading ? 'disabled' : ''}>
                            ${['balanced', 'professional', 'casual', 'creative'].map(tone => `
                                <option value="${tone}" ${this.state.titleTone === tone ? 'selected' : ''}>${tone.charAt(0).toUpperCase() + tone.slice(1)}</option>
                            `).join('')}
                        </select>
                        <p class="text-xs text-gray-500 mt-2">Brainstorm headlines from your content. Choose a suggestion to update the post title, or copy it.</p>
                    </div>
                `;
            }

            if (this.state.tab === 'resize') {
                return `
                    <div>
                        <label class="block text-xs font-semibold uppercase text-gray-500 mb-2">Resizing Mode</label>
                        <div class="statamic-ai-pill-group">
                            <button type="button" class="statamic-ai-pill ${this.state.subAction === 'shorten' ? 'selected' : ''}" data-subaction="shorten">
                                ${ICONS.shorten} Shorten
                            </button>
                            <button type="button" class="statamic-ai-pill ${this.state.subAction === 'expand' ? 'selected' : ''}" data-subaction="expand">
                                ${ICONS.expand} Expand
                            </button>
                            <button type="button" class="statamic-ai-pill ${this.state.subAction === 'rephrase' ? 'selected' : ''}" data-subaction="rephrase">
                                ${ICONS.rephrase} Rephrase
                            </button>
                        </div>
                    </div>
                `;
            }

            if (this.state.tab === 'summarize') {
                return `
                    <div>
                        <label class="block text-xs font-semibold uppercase text-gray-500 mb-2">Summary Format</label>
                        <div class="statamic-ai-pill-group">
                            <button type="button" class="statamic-ai-pill ${this.state.summaryFormat === 'bullets' ? 'selected' : ''}" data-summary="bullets">
                                * Bullet Points
                            </button>
                            <button type="button" class="statamic-ai-pill ${this.state.summaryFormat === 'paragraph' ? 'selected' : ''}" data-summary="paragraph">
                                📝 Paragraph Overview
                            </button>
                            <button type="button" class="statamic-ai-pill ${this.state.summaryFormat === 'tldr' ? 'selected' : ''}" data-summary="tldr">
                                ⚡ One-line TL;DR
                            </button>
                        </div>
                    </div>
                `;
            }

            if (this.state.tab === 'translate') {
                const languages = this.settings.supported_languages || {};
                const options = Object.entries(languages).map(([code, name]) => {
                    return `<option value="${code}" ${this.state.targetLanguage === code ? 'selected' : ''}>${name}</option>`;
                }).join('');

                return `
                    <div class="flex flex-col gap-3">
                        <div>
                            <label class="block text-xs font-semibold uppercase text-gray-500 mb-1">Target Language</label>
                            <select class="statamic-ai-select" id="statamic-ai-lang-select">
                                ${options}
                            </select>
                        </div>
                        ${this.state.postTitle ? `
                            <label class="statamic-ai-checkbox-label">
                                <input type="checkbox" id="statamic-ai-trans-title" ${this.state.translateTitle ? 'checked' : ''}>
                                <span>Also translate Post Title (<em>"${this.escapeHtml(this.state.postTitle)}"</em>)</span>
                            </label>
                        ` : ''}
                    </div>
                `;
            }

            if (this.state.tab === 'classify') {
                return `
                    <div class="flex flex-col gap-2">
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Suggests relevant tags and categories based on the content. Click any tag to copy it.
                        </p>
                    </div>
                `;
            }

            if (this.state.tab === 'custom') {
                return `
                    <div>
                        <label class="block text-xs font-semibold uppercase text-gray-500 mb-1">Instruction</label>
                        <input type="text" class="statamic-ai-input" id="statamic-ai-custom-input"
                            value="${this.escapeHtml(this.state.customPrompt)}"
                            placeholder="e.g., Fix grammar and spelling, make tone more professional, convert into table...">
                    </div>
                `;
            }

            return '';
        }

        renderResultArea() {
            if (this.state.loading) {
                return `
                    <div class="statamic-ai-loading">
                        <div class="statamic-ai-spinner"></div>
                        <span>Processing with ${this.escapeHtml(this.settings.model)}...</span>
                    </div>
                `;
            }

            if (this.state.error) {
                return `
                    <div class="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                        <strong>Error:</strong> ${this.escapeHtml(this.state.error)}
                    </div>
                `;
            }

            if (this.state.tab === 'titles') {
                const canApply = !!this.getTitleInput();
                return `
                    <div class="statamic-ai-title-suggestions">
                        ${this.state.titleSuggestions.map((title, index) => `
                            <div class="statamic-ai-title-suggestion">
                                <span>${this.escapeHtml(title)}</span>
                                <div>
                                    <button type="button" class="statamic-ai-btn statamic-ai-btn-secondary" data-copy-title="${index}">${ICONS.copy} Copy</button>
                                    ${canApply ? `<button type="button" class="statamic-ai-btn statamic-ai-btn-primary" data-use-title="${index}">${ICONS.check} Use Title</button>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            if (this.state.tab === 'classify') {
                if (this.state.classificationTags.length === 0 && this.state.classificationCategories.length === 0) {
                    return `
                        <div class="text-center py-4">
                            <button type="button" class="statamic-ai-btn statamic-ai-btn-primary" data-action="run-classify">
                                ${ICONS.classify} Analyze Content & Suggest Tags
                            </button>
                        </div>
                    `;
                }

                return `
                    <div class="flex flex-col gap-4">
                        ${this.state.classificationCategories.length > 0 ? `
                            <div>
                                <label class="block text-xs font-semibold uppercase text-gray-500 mb-1">Suggested Categories</label>
                                <div class="statamic-ai-tags-container">
                                    ${this.state.classificationCategories.map(cat => `
                                        <button type="button" class="statamic-ai-tag-chip" data-copy-tag="${this.escapeHtml(cat)}">
                                            📁 ${this.escapeHtml(cat)}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <label class="text-xs font-semibold uppercase text-gray-500">Suggested Tags</label>
                                <button type="button" class="text-xs text-sky-600 dark:text-sky-400 font-medium hover:underline" data-action="copy-all-tags">
                                    Copy All Tags
                                </button>
                            </div>
                            <div class="statamic-ai-tags-container">
                                ${this.state.classificationTags.map(tag => `
                                    <button type="button" class="statamic-ai-tag-chip" data-copy-tag="${this.escapeHtml(tag)}">
                                        🏷️ #${this.escapeHtml(tag)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }

            if (!this.state.generatedText) {
                return `
                    <div class="text-center py-2">
                        <button type="button" class="statamic-ai-btn statamic-ai-btn-primary" data-action="generate">
                            ${ICONS.sparkles} Generate with AI
                        </button>
                    </div>
                `;
            }

            const genWords = this.state.generatedText.trim()
                ? this.state.generatedText.trim().split(/\s+/).length
                : 0;

            return `
                <div class="statamic-ai-preview-box">
                    <div class="statamic-ai-preview-header">
                        <span>AI Output (${genWords} words, ${this.state.generatedText.length} chars)</span>
                        <button type="button" class="text-xs text-sky-600 dark:text-sky-400 font-medium hover:underline flex items-center gap-1" data-action="generate">
                            🔄 Regenerate
                        </button>
                    </div>
                    <textarea class="statamic-ai-result-textarea" id="statamic-ai-result-input">${this.escapeHtml(this.state.generatedText)}</textarea>
                    ${this.state.translatedTitle ? `
                        <div class="p-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-950/20 text-xs flex items-center justify-between">
                            <div>
                                <span class="font-semibold text-gray-700 dark:text-gray-300">Translated Post Title:</span>
                                <span class="text-sky-700 dark:text-sky-300 ml-1">"${this.escapeHtml(this.state.translatedTitle)}"</span>
                            </div>
                            <button type="button" class="statamic-ai-btn statamic-ai-btn-secondary text-xs" data-action="apply-title">
                                Update Title
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        renderFooterActions() {
            if (this.state.tab === 'titles') {
                return `<button type="button" class="statamic-ai-btn statamic-ai-btn-primary" data-action="run-titles" ${this.state.loading ? 'disabled' : ''}>
                    ${ICONS.sparkles} ${this.state.titleSuggestions.length ? 'Regenerate Titles' : 'Generate Titles'}
                </button>`;
            }

            if (this.state.tab === 'classify') {
                return `
                    <button type="button" class="statamic-ai-btn statamic-ai-btn-primary" data-action="copy-all-tags">
                        ${ICONS.copy} Copy All Tags
                    </button>
                `;
            }

            if (!this.state.generatedText) {
                return `
                    <button type="button" class="statamic-ai-btn statamic-ai-btn-primary" data-action="generate" ${this.state.loading ? 'disabled' : ''}>
                        ${ICONS.sparkles} Generate
                    </button>
                `;
            }

            return `
                <button type="button" class="statamic-ai-btn statamic-ai-btn-secondary" data-action="copy">
                    ${ICONS.copy} Copy
                </button>
                <button type="button" class="statamic-ai-btn statamic-ai-btn-secondary" data-action="insert-below">
                    ${ICONS.insert} Insert Below
                </button>
                <button type="button" class="statamic-ai-btn statamic-ai-btn-primary" data-action="replace">
                    ${ICONS.check} Replace Selection
                </button>
            `;
        }

        bindEvents() {
            if (!this.modalEl) return;

            // Close buttons
            this.modalEl.querySelectorAll('[data-action="close"]').forEach(btn => {
                btn.addEventListener('click', () => this.close());
            });

            // Tabs
            this.modalEl.querySelectorAll('.statamic-ai-tab').forEach(tab => {
                tab.disabled = this.state.loading;
                tab.addEventListener('click', () => {
                    if (this.state.loading) return;
                    this.state.tab = tab.dataset.tab;
                    this.state.error = null;
                    this.renderModal();
                    if (this.state.tab === 'classify' && this.state.classificationTags.length === 0) {
                        this.runClassification();
                    } else if (this.state.tab === 'titles' && this.state.titleSuggestions.length === 0) {
                        this.runTitleGeneration();
                    }
                });
            });

            // Title generation controls
            const toneSelect = this.modalEl.querySelector('#statamic-ai-title-tone');
            if (toneSelect) {
                toneSelect.addEventListener('change', (e) => {
                    this.state.titleTone = e.target.value;
                    this.runTitleGeneration();
                });
            }
            this.modalEl.querySelectorAll('[data-action="run-titles"]').forEach(btn => {
                btn.addEventListener('click', () => this.runTitleGeneration());
            });
            this.modalEl.querySelectorAll('[data-copy-title]').forEach(btn => {
                btn.addEventListener('click', () => this.copyToClipboard(this.state.titleSuggestions[Number(btn.dataset.copyTitle)]));
            });
            this.modalEl.querySelectorAll('[data-use-title]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.applyTitleUpdate(this.state.titleSuggestions[Number(btn.dataset.useTitle)]);
                    this.close();
                });
            });

            // Resizing sub-actions
            this.modalEl.querySelectorAll('[data-subaction]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.state.subAction = btn.dataset.subaction;
                    this.renderModal();
                });
            });

            // Summarize formats
            this.modalEl.querySelectorAll('[data-summary]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.state.summaryFormat = btn.dataset.summary;
                    this.renderModal();
                });
            });

            // Target language select
            const langSelect = this.modalEl.querySelector('#statamic-ai-lang-select');
            if (langSelect) {
                langSelect.addEventListener('change', (e) => {
                    this.state.targetLanguage = e.target.value;
                });
            }

            // Translate title checkbox
            const transTitleCheckbox = this.modalEl.querySelector('#statamic-ai-trans-title');
            if (transTitleCheckbox) {
                transTitleCheckbox.addEventListener('change', (e) => {
                    this.state.translateTitle = e.target.checked;
                });
            }

            // Custom prompt input
            const customInput = this.modalEl.querySelector('#statamic-ai-custom-input');
            if (customInput) {
                customInput.addEventListener('input', (e) => {
                    this.state.customPrompt = e.target.value;
                });
                customInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.generate();
                    }
                });
            }

            // Result input change
            const resultInput = this.modalEl.querySelector('#statamic-ai-result-input');
            if (resultInput) {
                resultInput.addEventListener('input', (e) => {
                    this.state.generatedText = e.target.value;
                });
            }

            // Generate button
            this.modalEl.querySelectorAll('[data-action="generate"]').forEach(btn => {
                btn.addEventListener('click', () => this.generate());
            });

            // Run classify button
            this.modalEl.querySelectorAll('[data-action="run-classify"]').forEach(btn => {
                btn.addEventListener('click', () => this.runClassification());
            });

            // Replace button
            this.modalEl.querySelectorAll('[data-action="replace"]').forEach(btn => {
                btn.addEventListener('click', () => this.applyReplacement());
            });

            // Insert Below button
            this.modalEl.querySelectorAll('[data-action="insert-below"]').forEach(btn => {
                btn.addEventListener('click', () => this.applyInsertBelow());
            });

            // Copy button
            this.modalEl.querySelectorAll('[data-action="copy"]').forEach(btn => {
                btn.addEventListener('click', () => this.copyToClipboard(this.state.generatedText));
            });

            // Copy tag chip
            this.modalEl.querySelectorAll('[data-copy-tag]').forEach(chip => {
                chip.addEventListener('click', () => {
                    const tag = chip.dataset.copyTag;
                    this.copyToClipboard(tag);
                    chip.classList.add('copied');
                    setTimeout(() => chip.classList.remove('copied'), 1200);
                });
            });

            // Copy all tags
            this.modalEl.querySelectorAll('[data-action="copy-all-tags"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const allTags = this.state.classificationTags.join(', ');
                    this.copyToClipboard(allTags);
                });
            });

            // Apply title button
            this.modalEl.querySelectorAll('[data-action="apply-title"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.applyTitleUpdate(this.state.translatedTitle);
                });
            });
        }

        async generate() {
            if (!this.state.originalText.trim()) {
                this.toast('Please select some text in the editor first.', 'error');
                return;
            }

            this.state.loading = true;
            this.state.error = null;
            this.renderModal();

            try {
                let payload = {
                    text: this.state.originalText,
                };

                if (this.state.tab === 'resize') {
                    payload.action = this.state.subAction; // shorten, expand, rephrase
                } else if (this.state.tab === 'summarize') {
                    payload.action = 'summarize';
                    payload.format = this.state.summaryFormat;
                } else if (this.state.tab === 'translate') {
                    payload.action = 'translate';
                    payload.target_language = this.state.targetLanguage;
                    payload.is_title = false;
                } else if (this.state.tab === 'custom') {
                    payload.action = 'custom';
                    payload.prompt = this.state.customPrompt;
                }

                const response = await this.axios().post(this.cpUrl('ai-writer/process'), payload);
                if (response.data && response.data.success) {
                    this.state.generatedText = response.data.result;

                    // If translate title is selected, translate post title too
                    if (this.state.tab === 'translate' && this.state.translateTitle && this.state.postTitle) {
                        try {
                            const titleRes = await this.axios().post(this.cpUrl('ai-writer/process'), {
                                text: this.state.postTitle,
                                action: 'translate',
                                target_language: this.state.targetLanguage,
                                is_title: true,
                            });
                            if (titleRes.data && titleRes.data.success) {
                                this.state.translatedTitle = titleRes.data.result;
                            }
                        } catch (titleErr) {
                            console.error('Failed translating post title:', titleErr);
                        }
                    }
                } else {
                    this.state.error = response.data?.error || 'Unknown error occurred.';
                }
            } catch (err) {
                this.state.error = err.response?.data?.error || err.message || 'API request failed.';
            } finally {
                this.state.loading = false;
                this.renderModal();
            }
        }

        async runClassification() {
            const content = this.state.originalText.trim() || this.getFullEditorContent();
            if (!content) {
                this.toast('No content available to classify.', 'error');
                return;
            }

            this.state.loading = true;
            this.state.error = null;
            this.renderModal();

            try {
                const response = await this.axios().post(this.cpUrl('ai-writer/classify'), {
                    content: content,
                });

                if (response.data && response.data.success) {
                    this.state.classificationTags = response.data.tags || [];
                    this.state.classificationCategories = response.data.categories || [];
                } else {
                    this.state.error = response.data?.error || 'Classification failed.';
                }
            } catch (err) {
                this.state.error = err.response?.data?.error || err.message || 'Classification request failed.';
            } finally {
                this.state.loading = false;
                this.renderModal();
            }
        }

        async runTitleGeneration() {
            if (this.state.loading) return;
            const content = this.getFullEditorContent().trim() || this.state.originalText.trim();
            if (!content) {
                this.state.error = 'Add or select some post content before generating titles.';
                this.renderModal();
                return;
            }

            this.state.loading = true;
            this.state.error = null;
            this.state.titleSuggestions = [];
            this.renderModal();
            const modal = this.modalEl;

            try {
                const response = await this.axios().post(this.cpUrl('ai-writer/titles'), {
                    content,
                    title: this.getTitleInput()?.value || '',
                    tone: this.state.titleTone,
                });
                if (this.modalEl !== modal) return;
                if (!response.data?.success || !Array.isArray(response.data.titles) || !response.data.titles.length) {
                    throw new Error(response.data?.error || 'No title suggestions were returned. Please try again.');
                }
                this.state.titleSuggestions = response.data.titles;
            } catch (err) {
                if (this.modalEl === modal) {
                    this.state.error = err.response?.data?.error || err.response?.data?.message || err.message || 'Title generation failed.';
                }
            } finally {
                if (this.modalEl === modal) {
                    this.state.loading = false;
                    this.renderModal();
                }
            }
        }

        getFullEditorContent() {
            if (this.activeContext?.editor?.state?.doc) {
                return this.activeContext.editor.state.doc.textBetween(0, this.activeContext.editor.state.doc.content.size, '\n');
            }
            if (this.activeContext?.type === 'field') {
                return this.activeContext.value;
            }
            const editorEl = this.activeContext?.editorEl;
            const bard = editorEl?.closest('.bard-fieldtype')?.querySelector('.ProseMirror');
            if (bard) return bard.textContent || '';
            if (editorEl?.tagName === 'TEXTAREA') return editorEl.value;
            const textarea = editorEl?.querySelector('textarea')
                || document.querySelector('.bard-fieldtype textarea, .markdown-fieldtype textarea');
            if (textarea) return textarea.value;
            return '';
        }

        applyReplacement() {
            const newText = this.state.generatedText;
            if (!newText) return;

            const ctx = this.activeContext;

            if (ctx?.type === 'bard' && ctx.editor) {
                const { from, to } = ctx;
                ctx.editor.chain().focus().insertContentAt({ from, to }, newText).run();
            } else if (ctx?.type === 'field' && ctx.payload) {
                this.applyToField(ctx, newText);
            } else if (ctx?.type === 'dom' && ctx.editorEl) {
                this.replaceInDom(ctx, newText);
            } else {
                // Fallback: copy to clipboard
                this.copyToClipboard(newText);
            }

            // Auto-apply title if translated
            if (this.state.translatedTitle) {
                this.applyTitleUpdate(this.state.translatedTitle);
            }

            this.toast('Content updated successfully.');
            this.close();
        }

        applyInsertBelow() {
            const newText = this.state.generatedText;
            if (!newText) return;

            const ctx = this.activeContext;

            if (ctx?.type === 'bard' && ctx.editor) {
                const { to } = ctx;
                ctx.editor.chain().focus().insertContentAt(to, "\n\n" + newText).run();
            } else if (ctx?.type === 'field' && ctx.payload) {
                this.applyToField(ctx, newText, true);
            } else if (ctx?.type === 'dom' && ctx.editorEl) {
                this.insertBelowInDom(ctx, newText);
            } else {
                this.copyToClipboard(newText);
            }

            this.toast('Content inserted successfully.');
            this.close();
        }

        replaceInDom(ctx, newText) {
            // Check for CodeMirror
            const cmEl = ctx.editorEl.closest('.cm-editor');
            if (cmEl && cmEl.CodeMirror) {
                cmEl.CodeMirror.replaceSelection(newText);
                return;
            }

            // Check for textarea
            const textarea = ctx.editorEl.tagName === 'TEXTAREA'
                ? ctx.editorEl
                : ctx.editorEl.querySelector('textarea');

            if (textarea) {
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                textarea.setRangeText(newText, start, end, 'select');
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }

            // Check for Range in ContentEditable
            if (ctx.range) {
                ctx.range.deleteContents();
                ctx.range.insertNode(document.createTextNode(newText));
            }
        }

        insertBelowInDom(ctx, newText) {
            const textarea = ctx.editorEl.tagName === 'TEXTAREA'
                ? ctx.editorEl
                : ctx.editorEl.querySelector('textarea');

            if (textarea) {
                const end = textarea.selectionEnd;
                textarea.setRangeText("\n\n" + newText, end, end, 'select');
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                return;
            }

            if (ctx.range) {
                const br = document.createElement('br');
                const textNode = document.createTextNode(newText);
                ctx.range.collapse(false);
                ctx.range.insertNode(br);
                ctx.range.insertNode(textNode);
            }
        }

        getTitleInput() {
            const titleInput = document.querySelector('input[name="title"]') || document.getElementById('input-title');
            return titleInput && !titleInput.disabled && !titleInput.readOnly ? titleInput : null;
        }

        applyTitleUpdate(newTitle) {
            const titleInput = this.getTitleInput();
            if (titleInput && newTitle) {
                titleInput.value = newTitle;
                titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                titleInput.dispatchEvent(new Event('change', { bubbles: true }));
                this.toast('Post title updated.');
            }
        }

        copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                this.toast('Copied to clipboard!');
            }).catch(() => {
                this.toast('Failed to copy.', 'error');
            });
        }

        escapeHtml(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    }

    // Expose globally
    window.StatamicAiWriter = new StatamicAiWriterManager();

})();
