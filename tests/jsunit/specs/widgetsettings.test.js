/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      ${component}/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @param {number} delay 
 * @returns 
 */
const wait = function (delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}

const { component } = require('../src/common').default;
const Notification = require('core/notification').default;

/** Mock the CmEditor dependency */
const mockSetValue = jest.fn();
const mockGetValue = jest.fn();
jest.mock("../src/libs/cmeditor-lazy", () => {
    const MockCmEditor = jest.fn().mockImplementation((target) => ({
        setValue: mockSetValue.mockImplementation((txt) => {
            target.value = txt;
        }),
        getValue: mockGetValue.mockImplementation(() => {
            return target.value;
        }),

    }));
    return {
        __esModule: true,
        CmEditor: MockCmEditor,
        YAML: {
            parse: require('yaml').parse,
            fromJSON: (/** @type {string} */ json) => require('yaml').stringify(JSON.parse(json))
        }
    };
}, { virtual: true });


/** @type {*} */
const WidgetSettings = require('../src/widgetsettings').default;

const commonSelectors = {
    yml: '.yml-area',
    css: '.css-area',
    html: '.html-area',
    json: '.json-area',
    partials: '.partial-area',
    save: '.save-btn',
    saveandclose: '.save-close-btn',
    refreshbtn: '.refresh-btn'
};

/** 
 * @param {number|null} id 
 * @param {Record<string, *>} [partials] 
*/
function createBody(id, partials) {
    document.body.innerHTML = `
    <div id="p-yml"><div></div></div>
    <div id="p-css"><div></div></div>
    <div id="p-html"><div></div></div>
    <div id="p-tiny"><textarea id="tiny-editor"></textarea></div>
    <div id="p-preview"><iframe></iframe></div>
    <div id="p-log"></div>
    <form>
        <textarea class="yml-area"></textarea>
        <textarea class="css-area"></textarea>
        <textarea class="html-area"></textarea>
        <textarea class="json-area"></textarea>
        <textarea class="partial-area">${JSON.stringify(partials ?? {})}</textarea>
        <input class="save-btn" type="submit" name="save">
        <input class="save-close-btn" type="submit" name="saveandclose">
        <button class="refresh-btn"></button>
    </form>
    `;
}

describe('widget_settings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test.each([
        ['Invalid yml', 'key: key2\na:\n    - a\n  - !as', 'Yaml syntax error', []],
        ['Missing key', 'name: hello\ntemplate: here', "The properties 'key' are required ", []],
        ['Missing name', 'key: hello\ntemplate: here', "The properties 'name' are required ", []],
        ['Repeated key', 'key: key1\nname: name\ntemplate: here', "Key key1 is already in use. Please rename it ", ['key1', 'key2']],
        ['Repeated key', 'key: key0\nname: name\ntemplate: here\nfilter: filter', "The properties 'template' & 'filter' cannot be used simultaneously ", ['key1', 'key2']],
        ['Missing author', 'key: key3\nname: name\ntemplate: here', "The properties 'author' & 'version' are required", ['key1', 'key2']],
        ['Missing version', 'key: key3\nname: name\ntemplate: here\nauthor: pep', "The properties 'author' & 'version' are required ", ['key1', 'key2']],
        ['Valid definition', 'key: key3\nname: name\ntemplate: here\nauthor: pep\nversion: 1.0', '', ['key1', 'key2']],
    ])
        ('%s widget definition', async (issue, yml, msg, keys) => {
            const id = 0;
            const partials = {};
            createBody(id, partials);
            const instance = new WidgetSettings({
                id,
                keys: keys ?? [],
                selectors: commonSelectors
            });
            const validation = await instance.validate(yml, partials);
            expect(validation.msg).toContain(msg);
        });

    it('Creates a new widget when id = null', async () => {
        const id = null;
        const usedKeys = ['key1', 'key2', 'key3'];
        createBody(id);

        const instance = new WidgetSettings({ id, keys: usedKeys, selectors: commonSelectors });
        // The real init logic
        await instance.render();

        // Yml has been filled with default data
        expect(mockSetValue).toHaveBeenCalled();
        const editorArea = document.querySelector('#p-yml > div');
        expect(/** @type {any} */(editorArea).value).toContain('key: username_sample');

        // Try to press preview button
        const previewBtn = document.body.querySelector(".refresh-btn");
        if (previewBtn) {
            /** @type {HTMLButtonElement} */(previewBtn).click();
        }
        await wait(400);

        // Check if the preview log contains success or if it didn't fail
        expect(Notification.alert).not.toHaveBeenCalled();
        expect(mockGetValue).toHaveBeenCalled();

        // Check the jsonArea is filled after preSaveAction
        const passed = await instance.preSaveAction();
        expect(passed).toBe(true);
        const jsonArea = document.querySelector('.json-area');
        expect(jsonArea ? (/** @type {HTMLTextAreaElement} */(jsonArea)).value.indexOf("Minimal sample widget") : -1).toBeGreaterThanOrEqual(0);

        // Expect save button to submit new widget
        const saveBtn = document.querySelector('.save-btn');
        expect(saveBtn).toBeTruthy();
        mockGetValue.mockClear();
        // saveBtn?.click(); // Simulating submit is hard with JSDOM if it does form.submit()
        await instance.preSaveAction();
        expect(mockGetValue).toHaveBeenCalled();
    });

    it('Edits an existing widget with id > 0', async () => {
        const id = 123;
        const usedKeys = ['key1', 'key2', 'key3'];
        createBody(id);

        const jsonArea = /** @type {HTMLTextAreaElement} */(document.querySelector('.json-area'));
        const widgetToEdit = {
            id,
            key: 'key2',
            name: 'name2',
            template: '<p>Widget2</p>',
            author: 'pep',
            version: '1.0'
        };
        if (jsonArea) {
            jsonArea.value = JSON.stringify(widgetToEdit);
        }
        const ymlArea = /** @type {HTMLTextAreaElement} */(document.querySelector('.yml-area'));

        const instance = new WidgetSettings({ id, keys: usedKeys, selectors: commonSelectors });
        await instance.render();

        // Yml has been filled from JSON
        expect(mockSetValue).toHaveBeenCalled();
        const editorArea = document.querySelector('#p-yml > div');
        expect(/** @type {any} */(editorArea).value).toContain('key: key2');

        // Try to press preview button
        const previewBtn = document.body.querySelector(".refresh-btn");
        if (previewBtn) {
            /** @type {HTMLButtonElement} */(previewBtn).click();
        }
        await wait(400);

        // No errors found
        expect(Notification.alert).not.toHaveBeenCalled();
        expect(mockGetValue).toHaveBeenCalled();

        // Make changes to the widget (corrupt it)
        // Note: we must update the mock's value because preSaveAction calls getValue()
        mockGetValue.mockReturnValue(`key: key2
name: name2
author: 'pep'
version: '1.0'`);


        // missing template
        const validation = await instance.validate(mockGetValue(), {});
        expect(validation.msg).toContain("template");

        const passed = await instance.preSaveAction();
        expect(passed).toBe(false);
    });
});