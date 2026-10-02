const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

for (const asset of ['resources/js/ai-writer.js', 'dist/js/ai-writer.js']) {
    for (const scenario of [
        { name: 'server config allows access before Statamic.config()', initial: { allowed: true, configured: true }, allowed: true },
        { name: 'server config denies access before Statamic.config()', initial: { allowed: false, configured: true }, allowed: false },
        { name: 'missing config denies access', allowed: false },
        { name: 'initialized config denial takes precedence', initial: { allowed: true, configured: true }, current: { allowed: false, configured: true }, allowed: false },
        { name: 'initialized config grant takes precedence', initial: { allowed: false, configured: true }, current: { allowed: true, configured: true }, allowed: true },
    ]) {
        test(`${asset}: ${scenario.name}`, async () => {
            const fieldActions = [];
            const bardButtons = [];
            const listeners = [];
            const booted = [];
            const requests = [];
            let config = scenario.current;
            const window = {
                StatamicConfig: scenario.initial ? { aiWriter: scenario.initial } : undefined,
                Statamic: {
                    $config: { get: key => key === 'aiWriter' ? config : undefined },
                    $fieldActions: { add: (binding, action) => fieldActions.push({ binding, action }) },
                    $bard: { buttons: callback => bardButtons.push(callback([], () => {})) },
                    booted: callback => booted.push(callback),
                },
            };

            runInNewContext(readFileSync(resolve(__dirname, '../..', asset), 'utf8'), {
                window,
                document: { addEventListener: event => listeners.push(event) },
            });

            const manager = window.StatamicAiWriter;
            assert.equal(manager.allowed, scenario.allowed);
            assert.equal(fieldActions.length, scenario.allowed ? 2 : 0);
            assert.equal(bardButtons.length, scenario.allowed ? 1 : 0);
            assert.equal(listeners.length, scenario.allowed ? 3 : 0);
            assert.equal(booted.length, scenario.allowed ? 1 : 0);
            assert.equal(requests.length, 0);

            // The CP configures Statamic and creates Axios after loading addons.
            config = scenario.current || scenario.initial;
            window.Statamic.$app = { config: { globalProperties: { $axios: {
                async get(url) {
                    requests.push(url);
                    return { data: { configured: true, model: 'startup-model', default_language: 'en' } };
                },
            } } } };
            for (const callback of booted) await callback();

            assert.deepEqual(requests, scenario.allowed ? ['/cp/ai-writer/settings'] : []);
            if (scenario.allowed) {
                assert.equal(manager.settings.configured, true);
                assert.equal(manager.settings.model, 'startup-model');
                assert.equal(manager.state.targetLanguage, 'en');
                assert.deepEqual(fieldActions.map(({ binding }) => binding), ['markdown-fieldtype', 'textarea-fieldtype']);
            }
        });
    }
}
