const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

function managerFor(asset, translations, current) {
    const actions = [];
    const buttons = [];
    const window = {
        StatamicConfig: { aiWriter: { allowed: true, configured: true, translations } },
        Statamic: {
            $config: { get: key => key === 'aiWriter' ? current : undefined },
            $fieldActions: { add: (binding, action) => actions.push(action) },
            $bard: { buttons: callback => buttons.push(callback([], () => {})) },
            booted: () => {},
        },
    };
    runInNewContext(readFileSync(resolve(__dirname, '../..', asset), 'utf8'), {
        window,
        document: { addEventListener: () => {}, querySelector: () => null, getElementById: () => null },
    });
    return { manager: window.StatamicAiWriter, actions, buttons };
}

for (const asset of ['resources/js/ai-writer.js', 'dist/js/ai-writer.js']) {
    test(`${asset}: editor integrations are translated before CP startup`, () => {
        const { manager, actions, buttons } = managerFor(asset, {
            assistant: 'KI-Assistent', shorten: 'Kürzen', resizing_mode: 'Bearbeitungsmodus',
        });
        assert.equal(actions[0].title, 'KI-Assistent');
        assert.equal(buttons[0].text, 'KI-Assistent');
        assert.match(manager.renderTabContent(), /Kürzen/);
        assert.match(manager.renderTabContent(), /Bearbeitungsmodus/);
        assert.match(manager.renderTabContent(), /Expand/); // Missing-key English fallback.
    });

    test(`${asset}: initialized CP translations take precedence`, () => {
        const { actions } = managerFor(asset, { assistant: 'KI-Assistent' }, {
            allowed: true, configured: true, translations: { assistant: 'AI Assistant' },
        });
        assert.equal(actions[0].title, 'AI Assistant');
    });

    test(`${asset}: interpolation and translated HTML are escaped safely`, () => {
        const { manager } = managerFor(asset, {
            processing: 'Verarbeitung mit :model ...',
            prompt_placeholder: 'Ein "Zitat" <script>',
        });
        assert.equal(manager.t('processing', '', { model: '$&:model' }), 'Verarbeitung mit $&:model ...');
        manager.state.loading = true;
        manager.settings.model = '<img src=x onerror=alert(1)>';
        assert.match(manager.renderResultArea(), /Verarbeitung mit &lt;img/);
        assert.doesNotMatch(manager.renderResultArea(), /<img/);
        manager.state.tab = 'custom';
        assert.match(manager.renderTabContent(), /Ein &quot;Zitat&quot; &lt;script&gt;/);
    });

    test(`${asset}: German tone, language, result actions and errors`, async () => {
        const { manager } = managerFor(asset, {
            tone_balanced: 'Ausgewogen', language_de: 'Deutsch',
            insert_below: 'Darunter einfügen', replace_selection: 'Auswahl ersetzen',
            no_title_content: 'Bitte zuerst Inhalt hinzufügen.',
        });
        manager.state.tab = 'titles';
        assert.match(manager.renderTabContent(), /Ausgewogen/);
        manager.state.tab = 'translate';
        assert.match(manager.renderTabContent(), />Deutsch<\/option>/);
        manager.state.generatedText = 'Inhalt';
        assert.match(manager.renderFooterActions(), /Darunter einfügen/);
        assert.match(manager.renderFooterActions(), /Auswahl ersetzen/);
        manager.renderModal = () => {};
        await manager.runTitleGeneration();
        assert.equal(manager.state.error, 'Bitte zuerst Inhalt hinzufügen.');
    });
}
