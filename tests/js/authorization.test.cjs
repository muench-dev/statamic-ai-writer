const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const { resolve } = require('node:path');

function setup(access) {
    const actions = [];
    const buttons = [];
    const listeners = [];
    const requests = [];
    const window = {
        axios: { get: async (url) => { requests.push(url); return { data: {} }; } },
        Statamic: {
            $config: { get: (key) => key === 'aiWriter' ? access : undefined },
            $fieldActions: { add: (...args) => actions.push(args) },
            $bard: { buttons: (button) => buttons.push(button) },
        },
    };
    const document = { addEventListener: (...args) => listeners.push(args) };
    runInNewContext(readFileSync(resolve(__dirname, '../../resources/js/ai-writer.js'), 'utf8'), {
        window, document, console,
    });
    return { manager: window.StatamicAiWriter, actions, buttons, listeners, requests };
}

test('users without permission get no Bard, field or floating selection integrations', () => {
    for (const access of [undefined, { allowed: false, configured: true }]) {
        const { manager, actions, buttons, listeners, requests } = setup(access);
        assert.equal(actions.length + buttons.length + listeners.length + requests.length, 0);
        manager.renderModal = () => assert.fail('Unauthorized dialog must stay closed');
        manager.open({ text: 'Text' });
        manager.handleSelectionChange({});
    }
});

test('authorized users without an API key receive setup guidance without opening the dialog', () => {
    const { manager } = setup({ allowed: true, configured: false });
    let message;
    manager.toast = (text, type) => { message = text; assert.equal(type, 'error'); };
    manager.renderModal = () => assert.fail('Unconfigured dialog must not send requests');
    manager.open({ text: 'Text' });
    assert.match(message, /OPEN_AI_API_KEY/);
});
