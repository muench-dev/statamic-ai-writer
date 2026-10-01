const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { resolve } = require('node:path');

function setup() {
    const actions = {};
    const document = {
        addEventListener() {},
        querySelector() { return null; },
        getElementById() { return null; },
    };
    const window = {
        axios: { get: async () => ({ data: {} }) },
        Statamic: {
            $fieldActions: {
                add(binding, action) { (actions[binding] ||= []).push(action); },
            },
        },
    };
    runInNewContext(readFileSync(resolve(__dirname, '../../resources/js/ai-writer.js'), 'utf8'), {
        window, document, console, Event,
    });
    const manager = window.StatamicAiWriter;
    manager.toast = () => {};
    manager.renderModal = function () {
        this.modalEl = { remove() {} };
    };
    manager.state.tab = 'resize';
    return { manager, actions };
}

// Minimal CodeMirror 5 stand-in operating on a flat string with numeric positions.
function fakeCodeMirror(value, selection = null) {
    return {
        value,
        getValue() { return this.value; },
        somethingSelected() { return selection !== null; },
        listSelections() { return [{ anchor: selection[1], head: selection[0] }]; },
        indexFromPos(pos) { return pos; },
        posFromIndex(index) { return index; },
        replaceRange(text, from, to) { this.value = this.value.slice(0, from) + text + this.value.slice(to); },
    };
}

test('registers a quick AI Assistant action for markdown and textarea fields', () => {
    const { actions } = setup();
    for (const binding of ['markdown-fieldtype', 'textarea-fieldtype']) {
        assert.equal(actions[binding].length, 1);
        assert.equal(actions[binding][0].title, 'AI Assistant');
        assert.equal(actions[binding][0].quick, true);
    }
});

test('markdown selection is preloaded and replaced in CodeMirror', () => {
    const { manager, actions } = setup();
    const cm = fakeCodeMirror('Intro. Rewrite me. Outro.', [7, 18]);
    actions['markdown-fieldtype'][0].run({ vm: { codemirror: cm }, value: cm.value, update() { assert.fail('CodeMirror must be edited directly'); } });
    assert.equal(manager.state.originalText, 'Rewrite me.');
    manager.state.generatedText = 'Better text.';
    manager.applyReplacement();
    assert.equal(cm.value, 'Intro. Better text. Outro.');
});

test('without a selection the whole field is used and title generation reads it', () => {
    const { manager, actions } = setup();
    const cm = fakeCodeMirror('The whole markdown post.');
    actions['markdown-fieldtype'][0].run({ vm: { codemirror: cm }, value: cm.value, update() {} });
    assert.equal(manager.state.originalText, 'The whole markdown post.');
    assert.equal(manager.getFullEditorContent(), 'The whole markdown post.');
});

test('insert below appends after the selection', () => {
    const { manager, actions } = setup();
    const cm = fakeCodeMirror('First. Second.', [0, 6]);
    actions['markdown-fieldtype'][0].run({ vm: { codemirror: cm }, value: cm.value, update() {} });
    manager.state.generatedText = 'Summary.';
    manager.applyInsertBelow();
    assert.equal(cm.value, 'First.\n\nSummary. Second.');
});

test('textarea fields update the field value through the payload', () => {
    const { manager, actions } = setup();
    let updated;
    const textarea = { selectionStart: 4, selectionEnd: 9 };
    actions['textarea-fieldtype'][0].run({
        vm: { $el: { querySelector: () => textarea } },
        value: 'Old short text',
        update(value) { updated = value; },
    });
    assert.equal(manager.state.originalText, 'short');
    manager.state.generatedText = 'longer';
    manager.applyReplacement();
    assert.equal(updated, 'Old longer text');
});
