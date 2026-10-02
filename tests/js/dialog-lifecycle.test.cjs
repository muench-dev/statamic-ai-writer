const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { resolve } = require('node:path');

function setup() {
    const keyHandlers = new Set();
    const document = {
        activeElement: null,
        addEventListener(type, handler) { if (type === 'keydown') keyHandlers.add(handler); },
        removeEventListener(type, handler) { if (type === 'keydown') keyHandlers.delete(handler); },
        querySelector() { return null; },
        getElementById() { return null; },
    };
    const window = {
        Statamic: { $config: { get: key => key === 'aiWriter' ? { allowed: true, configured: true } : undefined } },
        axios: { get: async () => ({ data: {} }) },
    };
    runInNewContext(readFileSync(resolve(__dirname, '../../resources/js/ai-writer.js'), 'utf8'), {
        window, document, console,
    });
    const manager = window.StatamicAiWriter;
    manager.toast = () => {};
    manager.renderModal = function () { this.modalEl = { remove() {} }; };
    manager.open({ text: 'First document' });
    return { manager, window, document, keyHandlers };
}

for (const method of ['generate', 'runClassification', 'runTitleGeneration']) {
    test(`${method} ignores a late response after closing the dialog`, async () => {
        const { manager, window } = setup();
        let finish;
        window.axios.post = () => new Promise(resolve => { finish = resolve; });
        const pending = manager[method]();
        manager.close();
        finish({ data: { success: true, result: 'Old text', tags: ['old'], categories: ['Old'], titles: ['Old'] } });
        await pending;
        assert.equal(manager.modalEl, null);
        assert.equal(manager.state.generatedText, '');
        assert.equal(manager.state.classificationTags.length, 0);
        assert.equal(manager.state.titleSuggestions.length, 0);
    });

    test(`${method} cannot overwrite or stop a newer request in another field`, async () => {
        const { manager, window } = setup();
        const requests = [];
        window.axios.post = () => new Promise((resolve, reject) => { requests.push({ resolve, reject }); });
        const previous = manager[method]();
        manager.close();
        manager.open({ text: 'Second document' });
        const current = manager[method]();
        const modal = manager.modalEl;
        requests[0].resolve({ data: { success: true, result: 'Old text', tags: ['old'], categories: ['Old'], titles: ['Old'] } });
        await previous;
        assert.equal(manager.state.originalText, 'Second document');
        assert.equal(manager.state.generatedText, '');
        assert.equal(manager.state.classificationTags.length, 0);
        assert.equal(manager.state.titleSuggestions.length, 0);
        assert.equal(manager.state.loading, true);
        assert.equal(manager.modalEl, modal);
        requests[1].resolve({ data: { success: true, result: 'New text', tags: ['new'], categories: ['New'], titles: ['New'] } });
        await current;
        assert.equal(manager.state.loading, false);
        assert.equal(method === 'generate' ? manager.state.generatedText
            : method === 'runClassification' ? manager.state.classificationTags[0] : manager.state.titleSuggestions[0],
        method === 'generate' ? 'New text' : method === 'runClassification' ? 'new' : 'New');
    });

    test(`${method} ignores old errors and prevents duplicate in-flight requests`, async () => {
        const { manager, window } = setup();
        let reject;
        let calls = 0;
        window.axios.post = () => { calls++; return new Promise((resolve, fail) => { reject = fail; }); };
        const pending = manager[method]();
        await manager[method]();
        assert.equal(calls, 1);
        manager.close();
        manager.open({ text: 'Second document' });
        reject(new Error('Old failure'));
        await pending;
        assert.equal(manager.state.error, null);
        assert.equal(manager.state.originalText, 'Second document');
    });
}

test('late title translation cannot overwrite the title of a new session', async () => {
    const { manager, window } = setup();
    manager.state.tab = 'translate';
    manager.state.translateTitle = true;
    manager.state.postTitle = 'First title';
    let finish;
    const requests = [];
    let titleRequested;
    const titleRequest = new Promise(resolve => { titleRequested = resolve; });
    window.axios.post = async (url, payload) => {
        requests.push(payload);
        if (requests.length === 1) return { data: { success: true, result: 'Translated body' } };
        return new Promise(resolve => { finish = resolve; titleRequested(); });
    };
    const pending = manager.generate();
    await titleRequest;
    assert.equal(requests[1].text, 'First title');
    manager.close();
    manager.open({ text: 'Second document' });
    finish({ data: { success: true, result: 'Translated first title' } });
    await pending;
    assert.equal(manager.state.translatedTitle, '');
    assert.equal(manager.state.generatedText, '');
});

test('Escape stays active after other keys and closing restores focus and removes the handler', () => {
    const { manager, document, keyHandlers } = setup();
    const opener = { isConnected: true, focus() { document.activeElement = this; } };
    manager.close();
    document.activeElement = opener;
    manager.open({ text: 'Text' });
    const event = key => ({ key, preventDefault() {}, stopPropagation() {} });
    for (const handler of keyHandlers) handler(event('ArrowRight'));
    for (const handler of keyHandlers) handler(event('Escape'));
    assert.equal(manager.modalEl, null);
    assert.equal(document.activeElement, opener);
    assert.equal(keyHandlers.size, 0);
});

test('Tab and Shift+Tab wrap within the modal, including focus that escaped outside', () => {
    const { manager, document } = setup();
    const first = { focus() { document.activeElement = this; } };
    const last = { focus() { document.activeElement = this; } };
    manager.dialogFocusableElements = () => [first, last];
    manager.modalEl.contains = element => element === first || element === last;
    let prevented = 0;
    const tab = shiftKey => ({ key: 'Tab', shiftKey, preventDefault() { prevented++; } });
    document.activeElement = last;
    manager.handleDialogKeydown(tab(false));
    assert.equal(document.activeElement, first);
    manager.handleDialogKeydown(tab(true));
    assert.equal(document.activeElement, last);
    document.activeElement = {};
    manager.handleDialogKeydown(tab(false));
    assert.equal(document.activeElement, first);
    assert.equal(prevented, 3);
});
