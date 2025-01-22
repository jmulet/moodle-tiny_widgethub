/**
 * @jest-environment jsdom
 */
// Mock alert and confirm methods
window.alert = jest.fn();
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

/**
 * @param {number} delay 
 * @returns 
 */
const wait = function(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}

require('./module.mocks')(jest);
/** Mock the YmlEditor dependency */
const mockSetValue = jest.fn();
const mockGetValue = jest.fn();
jest.mock("../src/libs/ymleditor-lazy", () => {
    const MockYmlEditor = jest.fn().mockImplementation((target) => ({
        setValue: mockSetValue.mockImplementation((txt) => {
            target.value = txt;
        }),
        getValue: mockGetValue.mockImplementation( () => {
            return target.value;
        }) 
    }));
    return MockYmlEditor;
}, { virtual: true }); 

/** @type {*} */
const settingsModule = require('../src/widget_settings').default; 

/** 
 * @param {number} id 
 * @param {Record<string, *>} [partials] 
*/
function createBody(id, partials) {
    document.body.innerHTML = `
    <form>
    <textarea id="id_s_tiny_widgethub_defyml_${id}"></textarea>
    <textarea id="id_s_tiny_widgethub_def_${id}"></textarea>
    <input id="id_s_tiny_widgethub_partials_${id}" value='${JSON.stringify(partials ?? {})}' type="hidden">
    </form>
    `;
}

describe('widget_settings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('It retrieves the correct areas', () => {
       const id = 123;
       const partials = {
         LOREM: 'Lorem ipsum',
         LANG: {
            name: 'lang',
            title: 'Language',
            type: 'select',
            value: 'spanish',
            options: ['english', 'catalan', 'spanish', 'french']
         }
       };
       createBody(id, partials);
       const {$ymlArea, $jsonArea, $partialInput} = settingsModule.getAreas(id);
       expect($ymlArea.attr('id')).toBe(`id_s_tiny_widgethub_defyml_${id}`);
       expect($jsonArea.attr('id')).toBe(`id_s_tiny_widgethub_def_${id}`);
       expect($partialInput.attr('id')).toBe(`id_s_tiny_widgethub_partials_${id}`);
       expect($partialInput.val()).toBe(JSON.stringify(partials));
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
        const validation = await settingsModule.validate(yml,{id, keys: keys ?? []}, partials);
        expect(validation.msg).toContain(msg);
    });
 
    it('Creates a new widget when id = 0', async () => {
        const id = 0;
        const usedKeys = ['key1', 'key2', 'key3'];
        createBody(id);
        const spyUpdateYaml = jest.spyOn(settingsModule, 'updateYaml');
        const spyGetAreas = jest.spyOn(settingsModule, 'getAreas');
 
        await settingsModule.init({id, keys: usedKeys});

        expect(spyGetAreas).toHaveBeenCalledWith(id);
        const {$ymlArea, $jsonArea} = settingsModule.getAreas(id);
        // Editor setter has been called
        expect(mockSetValue).toHaveBeenCalled();
        expect(spyUpdateYaml).toHaveBeenCalled();
        // Yml has been filled with default data
        expect($ymlArea.val()).not.toBeFalsy();
        // Try to press preview button
        /** @type {HTMLButtonElement | null} */
        const previewBtn = document.body.querySelector("button.btn-secondary");
        previewBtn?.click();
        await wait(400);
        // No errors found
        expect(window.alert).not.toHaveBeenCalled();
        // Check the getValue from YmlEditor has been called
        expect(mockGetValue).toHaveBeenCalled();
        // Check if the preview panel is visible and contains text
        /** @type {HTMLDivElement | null} */
        const previewpanel = document.body.querySelector(`#tiny_widgethub_pp_${id}`);
        expect(previewpanel).toBeTruthy();
        expect(previewpanel?.classList?.contains('d-none')).toBe(false);
        expect(previewpanel?.innerHTML).toBeTruthy();
        // Check the jsonArea is filled
        expect($jsonArea.val().indexOf("Hello world!")>=0).toBeTruthy();

        // Delete button must not be in page
        expect(document.querySelector('button.btn-danger')).toBeNull();
        // Expect save button to submit new widget
        /** @type {HTMLButtonElement | null} */
        const saveBtn = document.querySelector('button.form-submit');
        expect(saveBtn).toBeTruthy();
        mockGetValue.mockClear();
        saveBtn?.click();
        expect(mockGetValue).toHaveBeenCalled();
        expect(window.alert).not.toHaveBeenCalled();
    });

    it('Edits an existing widget with id > 0', async() => {
        const id = 123;
        const usedKeys = ['key1', 'key2', 'key3'];
        createBody(id);
        const spyUpdateYaml = jest.spyOn(settingsModule, 'updateYaml');
        const spyGetAreas = jest.spyOn(settingsModule, 'getAreas');
        const {$ymlArea, $jsonArea} = settingsModule.getAreas(id);
        const widgetToEdit = {
            id,
            key: 'key2',
            name: 'name2',
            template: '<p>Widget2</p>',
            author: 'pep',
            version: '1.0'
        }
        $jsonArea.val(JSON.stringify(widgetToEdit));

        await settingsModule.init({id, keys: usedKeys});
        // Delete button must be in page
        expect(document.querySelector('button.btn-danger')).toBeTruthy();

        expect(spyGetAreas).toHaveBeenCalledWith(id);
        // Editor setter has been called
        expect(mockSetValue).toHaveBeenCalled();
        expect(spyUpdateYaml).toHaveBeenCalled();
        // Yml has been filled with default data
        expect($ymlArea.val()).toContain('key: key2');
        // Try to press preview button
        /** @type {HTMLButtonElement | null} */
        const previewBtn = document.body.querySelector("button.btn-secondary");
        previewBtn?.click();
        await wait(400);
        // No errors found
        expect(window.alert).not.toHaveBeenCalled();
        // Check the getValue from YmlEditor has been called
        expect(mockGetValue).toHaveBeenCalled();
        // Check if the preview panel is visible and contains text
        /** @type {HTMLDivElement | null} */
        const previewpanel = document.body.querySelector(`#tiny_widgethub_pp_${id}`);
        expect(previewpanel).toBeTruthy();
        expect(previewpanel?.classList?.contains('d-none')).toBe(false);
        expect(previewpanel?.innerHTML).toContain('Widget2');

        // Make changes to the widget
        $ymlArea.val(`key: key2\nname: name2\n author: 'pep'\nversion: '1.0'`)
        previewBtn?.click();
        await wait(400);

        // Expect save button not to submit new widget do to error validations
        /** @type {HTMLButtonElement | null} */
        const saveBtn = document.querySelector('button.form-submit');
        expect(saveBtn).toBeTruthy();
        mockGetValue.mockClear();
        saveBtn?.click();
        expect(mockGetValue).toHaveBeenCalled();
        expect(window.alert).toHaveBeenCalled();
    });

    it('Edits deletes an existing widget with id > 0', async () => {
        const id = 123;
        const usedKeys = ['key1', 'key2', 'key3'];
        createBody(id);
        const spyUpdateYaml = jest.spyOn(settingsModule, 'updateYaml');
        const spyGetAreas = jest.spyOn(settingsModule, 'getAreas');
        const {$ymlArea, $jsonArea} = settingsModule.getAreas(id);
        const widgetToEdit = {
            id,
            key: 'key2',
            name: 'name2',
            template: '<p>Widget2</p>',
            author: 'pep',
            version: '1.0'
        }
        $jsonArea.val(JSON.stringify(widgetToEdit));

        await settingsModule.init({id, keys: usedKeys});
        // Delete button must be in page
        /** @type {HTMLButtonElement | null} */
        const deleteBtn = document.querySelector('button.btn-danger');
        expect(deleteBtn).toBeTruthy();
        mockConfirm.mockClear();
        // Do not accept
        mockConfirm.mockReturnValue(false);
        /** @type {HTMLFormElement | null} */
        const form = document.body.querySelector('form');
        if(form) {
            form.submit = jest.fn().mockImplementation(e => e?.preventDefault());
        }
        deleteBtn?.click();
        await wait(500);
        expect(window.confirm).toHaveBeenCalled();
        expect($jsonArea.val()).toBeTruthy();
        expect($ymlArea.val()).toBeTruthy();
        // Expect $form.trigger not called
        expect(form?.submit).not.toHaveBeenCalled();

        // Repeat accepting confirm
        mockConfirm.mockClear(); 
        mockConfirm.mockReturnValue(true);
        deleteBtn?.click();
        await wait(500);
        expect(window.confirm).toHaveBeenCalled();
        // Expect $form.trigger to have been called
        expect(form?.submit).toHaveBeenCalled();
        expect($jsonArea.val()).toBeFalsy();
        expect($ymlArea.val()).toBeFalsy();
      

    });

});