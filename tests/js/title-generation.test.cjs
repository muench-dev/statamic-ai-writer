const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { resolve } = require('node:path');

function setup() {
    const titleInput = {
        value: 'Draft title',
        dispatchEvent(event) { this.events.push(event.type); },
        events: [],
    };
    const document = {
        addEventListener() {},
        querySelector(selector) { return selector === 'input[name="title"]' ? titleInput : null; },
        getElementById() { return null; },
    };
    const window = {
        axios: { get: async () => ({ data: {} }) },
    };
    runInNewContext(readFileSync(resolve(__dirname, '../../resources/js/ai-writer.js'), 'utf8'), {
        window, document, console, Event,
    });
    const manager = window.StatamicAiWriter;
    manager.toast = () => {};
    manager.renderModal = function () {
        this.modalEl = { remove() {} };
    };
    manager.state.tab = 'titles';
    manager.state.originalText = 'Selected paragraph';
    return { manager, window, titleInput };
}

test('titles use the full active Bard document and current headline with selected tone', async () => {
    const { manager, window } = setup();
    manager.activeContext = { editor: { state: { doc: {
        content: { size: 20 },
        textBetween: () => 'Full post with all paragraphs',
    } } } };
    manager.state.titleTone = 'creative';
    let payload;
    window.axios.post = async (url, data) => {
        assert.equal(url, '/cp/ai-writer/titles');
        payload = data;
        return { data: { success: true, titles: ['One', 'Two'] } };
    };
    await manager.runTitleGeneration();
    assert.equal(payload.content, 'Full post with all paragraphs');
    assert.equal(payload.title, 'Draft title');
    assert.equal(payload.tone, 'creative');
    assert.equal(manager.state.titleSuggestions.join(','), 'One,Two');
    assert.equal(manager.state.loading, false);
    assert.equal(manager.state.generatedText, '');
});

test('empty content never calls the provider and shows a retryable error', async () => {
    const { manager, window } = setup();
    manager.state.originalText = '  ';
    window.axios.post = () => { assert.fail('Empty content must not be sent'); };
    await manager.runTitleGeneration();
    assert.match(manager.state.error, /Add or select/);
    assert.equal(manager.state.loading, false);
});

test('clicking the titles tab starts generation without a second click', () => {
    const { manager } = setup();
    let click;
    const tab = { dataset: { tab: 'titles' }, addEventListener(event, handler) { click = handler; } };
    manager.state.tab = 'resize';
    manager.modalEl = {
        querySelector() { return null; },
        querySelectorAll(selector) { return selector === '.statamic-ai-tab' ? [tab] : []; },
    };
    let calls = 0;
    manager.runTitleGeneration = () => { calls++; };
    manager.bindEvents();
    click();
    assert.equal(manager.state.tab, 'titles');
    assert.equal(calls, 1);
});

test('active textarea content is preferred to another editor on the page', () => {
    const { manager } = setup();
    manager.activeContext = { editorEl: {
        tagName: 'TEXTAREA',
        value: 'Full active textarea content',
        closest() { return null; },
    } };
    assert.equal(manager.getFullEditorContent(), 'Full active textarea content');
});

test('provider failure clears loading and allows retry', async () => {
    const { manager, window } = setup();
    window.axios.post = async () => { throw { response: { data: { error: 'Rate limit reached' } } }; };
    await manager.runTitleGeneration();
    assert.equal(manager.state.error, 'Rate limit reached');
    assert.equal(manager.state.loading, false);
    window.axios.post = async () => ({ data: { success: true, titles: ['Recovered'] } });
    await manager.runTitleGeneration();
    assert.equal(manager.state.error, null);
    assert.equal(manager.state.titleSuggestions[0], 'Recovered');
});

test('closing a pending dialog prevents reopening it or overwriting a new session', async () => {
    const { manager, window } = setup();
    let finish;
    window.axios.post = () => new Promise(resolve => { finish = resolve; });
    const pending = manager.runTitleGeneration();
    manager.close();
    manager.state.titleSuggestions = ['New session'];
    finish({ data: { success: true, titles: ['Old response'] } });
    await pending;
    assert.equal(manager.modalEl, null);
    assert.equal(manager.state.titleSuggestions[0], 'New session');
});

test('title output is escaped and never offers body replacement actions', () => {
    const { manager, titleInput } = setup();
    manager.state.titleSuggestions = ['<script>alert("x")</script>'];
    const result = manager.renderResultArea();
    assert.match(result, /&lt;script&gt;/);
    assert.doesNotMatch(result, /<script>/);
    assert.match(result, /data-use-title/);
    assert.doesNotMatch(manager.renderFooterActions(), /replace|insert-below/);
    titleInput.readOnly = true;
    assert.doesNotMatch(manager.renderResultArea(), /data-use-title/);
});

test('applying a suggestion updates the title with reactive input and change events', () => {
    const { manager, titleInput } = setup();
    manager.applyTitleUpdate('A better headline');
    assert.equal(titleInput.value, 'A better headline');
    assert.deepEqual(titleInput.events, ['input', 'change']);
    assert.equal(manager.state.originalText, 'Selected paragraph');
});
