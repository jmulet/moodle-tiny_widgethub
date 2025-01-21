/**
 * @jest-environment jsdom
 */
require('../module.mocks')(jest);
const { getTemplateSrv } = require('../../src/service/template_service');

const wait = (/** @type{number} */ delay) => {
    return new Promise( (resolve) => {
        setTimeout(resolve, delay);
    });
};

// Make test reproducible
const util = require("../../src/util");

/** @ts-ignore */
const jQuery = require("jquery").default;
const {FormCtrl, getFormCtrl, Templates} = require("../../src/controller/form_ctrl");
 
/** @type {*} */
let mockEditor;

/** @type {*} */
const mockUserStorage = {
    getFromLocal: jest.fn(),
    getFromSession: jest.fn(),
    setToLocal: jest.fn(),
    setToSession: jest.fn()
};

/** @type {*} */
const mockTemplateSrv = {
    render: jest.fn(),
    renderMustache: jest.fn(),
    renderEJS: jest.fn()
};

/** @type {*} */
const mockFileSrv = {
    getImagePicker: jest.fn(),
    displayImagePicker: jest.fn()
};

/** @type {FormCtrl} */
let formCtrl;

describe("FormCtrl", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        let _id = 0;
        util.genID = () => {
            _id += 1;
            return (_id) + "";
        };
        mockEditor = require('../editor.mock')(12345, 0, "text selected");
        formCtrl = new FormCtrl(mockEditor, mockUserStorage, mockTemplateSrv, mockFileSrv, jQuery);
    })

    it("FormCtrl is created", () => {
        expect(formCtrl).not.toBeNull();
    });

    it("Create instance from cache", () => {
        const f1 = getFormCtrl(mockEditor);
        const f2 = getFormCtrl(mockEditor);
        expect(f1).toBeTruthy();
        expect(Object.is(f1, f2)).toBe(true);
        const f3 = getFormCtrl({...mockEditor, id: 123456});
        expect(f3).toBeTruthy();
        expect(Object.is(f1, f3)).toBe(false);
    });

    it("FormCtrl creates a context for a widget", () => {
        // Mock a method
        formCtrl.createControlHTML = jest.fn().mockImplementation((id, param, value) => {
            return `%${id} - ${param.name} - ${value}%`;
        });
        /** @type {*} */
        const widget = {
            name: "widget-name",
            defaults: {p1: "a", p2: 11},
            parameters: [
                {name: "p1", value: "a"},
                {name: "p2", value: 11}
            ],
            isFilter: () => false
        }
        const ctx = formCtrl.createContext(widget);
        expect(ctx.idtabpane).toBeTruthy();
        expect(ctx.selectmode).toBe(true);
        expect(ctx.name).toBe(widget.name);
        expect(ctx.instructions).toBeUndefined();
        expect(ctx.filter).toBe(false);
        expect(ctx.controls).toStrictEqual([
            "%12345 - p1 - a%",
            "%12345 - p2 - 11%",
        ]);

        expect(formCtrl.createControlHTML).toHaveBeenCalledTimes(2);
        expect(mockEditor.selection.getContent).toHaveBeenCalled();
    });


    test.each([
        ["textfield"],
        ["image"],
        ["numeric"],
        ["color"],
        ["textarea"],
        ["checkbox"],
        ["select"]
    ])("Must createControlHTML of type %s", (/** @type {*} */ type) => {
        /** @type {import("../../src/options").Param} */
        const param = {
            name: "bar",
            title: "The name",
            type,
            value: "100"
        };
        mockTemplateSrv.renderMustache = jest.fn().mockImplementation(
            () => `<b>${type} template</b>`
        );
        const markup = formCtrl.createControlHTML("12345", param, param.value);
        expect(markup).toBe(`<b>${type} template</b>`);
        let templateName = type.toUpperCase() + "TEMPLATE";
        expect(mockTemplateSrv.renderMustache)
            // @ts-ignore
            .toHaveBeenLastCalledWith(Templates[templateName], expect.anything());
    });


    it("Must extractFormParameters without transforms", () => {
        /** @type {*} */
        const widget = {
            name: "widget-name",
            defaults: {p1: "a", p2: 11},
            parameters: [
                {name: "p1", value: "", type: "textfield"},
                {name: "p2", value: "", type: "textarea"},
                {name: "p3", value: 0, type: "numeric"},
                {name: "p4", value: false, type: "checkbox"},
                {name: "p5", value: "#000000", type: "color"},
                {name: "p6", value: "", type: "select", options: ["a", "b", "c"]},
            ],
            isFilter: () => false
        };
        const form = jQuery(`
            <div>
                <input type="text" name="p1" value="Example">
                <textarea name="p2">A long text in the area</textarea>    
                <input type="number" name="p3" value="1975">
                <input type="checkbox" name="p4" checked>
                <input type="color" name="p5" value="#AABBCC">
                <select name="p6">
                    <option label="L1">a</option>
                    <option label="L2" selected>b</option>
                    <option label="L3">c</option>
                </select>
            </div>`);

        const extracted = formCtrl.extractFormParameters(widget, form, false);
        expect(extracted).toStrictEqual({
            p1: "Example",
            p2: "A long text in the area",
            p3: 1975,
            p4: true,
            p5: "rgb(170,187,204)",
            p6: "b"
        });
    });

    it("Must extractFormParameters with transforms", () => {
        /** @type {*} */
        const widget = {
            name: "widget-name",
            defaults: {p1: "a", p2: 11},
            parameters: [
                {name: "p1", value: "", type: "textfield", transform: "trim"},
                {name: "p2", value: "", type: "textarea", transform: "trim | toUpperCase"},                
            ],
            isFilter: () => false
        };
        const form = jQuery(`
            <div>
                <input type="text" name="p1" value="   Example  ">
                <textarea name="p2"> A long text in the area   </textarea>    
            </div>`);

        const extracted = formCtrl.extractFormParameters(widget, form, false);
        expect(extracted).toStrictEqual({
            p1: "Example",
            p2: "A LONG TEXT IN THE AREA"
        });
    });

    it("Use stored values for all variables starting with _ when saveall unset", () => {
        // Use the real templateSrv
        formCtrl = new FormCtrl(mockEditor, mockUserStorage, getTemplateSrv(), mockFileSrv, jQuery);
        mockUserStorage.getFromLocal = jest.fn().mockImplementation((key, def) => {
            if (key === 'values') {
                return {_saved: 'The new value'};
            } else if (key === 'saveall') {
                return false;
            } else if (key === 'saveall_data') {
                return {}
            }
            return def;
        });
        /** @type {any} */
        const widget = {
            name: "widget-name",
            defaults: {_saved: "old", age: 18},
            parameters: [
                {name: "_saved", value: "old", type: "textfield"},
                {name: "age", value: 18, min: 1, max: 110, type: "numeric"}
            ],
            isFilter: () => false
        };
        const ctx = formCtrl.createContext(widget);
        expect(mockUserStorage.getFromLocal).toHaveBeenCalledWith('values', {});
        expect(mockUserStorage.getFromLocal).toHaveBeenCalledWith('saveall', false);
        expect(mockUserStorage.getFromLocal).toHaveBeenCalledWith('saveall_data', {});
        expect(ctx.name).toBe(widget.name);
        expect(ctx.filter).toBe(false);
        expect(ctx.controls).toHaveLength(2);
        expect(ctx.controls[0]).toBeTruthy();
        const $control0 = jQuery(ctx.controls[0]).find('input');
        expect($control0.val()).toBe("The new value");
        expect($control0.attr('type')).toBe('text');
        const $control1 = jQuery(ctx.controls[1]).find('input');
        expect($control1.attr('min')).toBe('1');
        expect($control1.attr('type')).toBe('number');
        expect($control1.attr('max')).toBe('110');
        expect($control1.val()).toBe('18');
    });


    it("Use stored values for all variables starting with _ when saveall is ON", () => {
        // Use the real templateSrv
        formCtrl = new FormCtrl(mockEditor, mockUserStorage, getTemplateSrv(), mockFileSrv, jQuery);
        mockUserStorage.getFromLocal = jest.fn().mockImplementation((key, def) => {
            if (key === 'values') {
                return {_saved: 'The new value'};
            } else if (key === 'saveall') {
                return true;
            } else if (key === 'saveall_data') {
                return {wk111: {_saved: 'The new value 22', age: 49}};
            }
            return def;
        });
        /** @type {any} */
        const widget = {
            key: "wk111",
            name: "widget-name",
            defaults: {_saved: "old", age: 18},
            parameters: [
                {name: "_saved", value: "old", type: "textfield"},
                {name: "age", value: 18, min: 1, max: 110, type: "numeric"}
            ],
            isFilter: () => false
        };
        const ctx = formCtrl.createContext(widget);
        expect(mockUserStorage.getFromLocal).toHaveBeenCalledWith('values', {});
        expect(mockUserStorage.getFromLocal).toHaveBeenCalledWith('saveall', false);
        expect(mockUserStorage.getFromLocal).toHaveBeenCalledWith('saveall_data', {});
        expect(ctx.name).toBe(widget.name);
        expect(ctx.filter).toBe(false);
        expect(ctx.controls).toHaveLength(2);
        expect(ctx.controls[0]).toBeTruthy();
        const $control0 = jQuery(ctx.controls[0]).find('input');
        expect($control0.val()).toBe("The new value 22");
        expect($control0.attr('type')).toBe('text');
        const $control1 = jQuery(ctx.controls[1]).find('input');
        expect($control1.attr('min')).toBe('1');
        expect($control1.attr('type')).toBe('number');
        expect($control1.attr('max')).toBe('110');
        expect($control1.val()).toBe('49');
    });


    it('Applies field watchers showing and hidding controls depending on input', async() => {
        // Use the real templateSrv
        formCtrl = new FormCtrl(mockEditor, mockUserStorage, getTemplateSrv(), mockFileSrv, jQuery);
        /** @type {any} */
        const widget = {
            key: "wk111",
            name: "widget-name",
            defaults: {opt: false, lst: 'spain', txt: 'Not editable'},
            parameters: [
                {name: "opt", value: false, type: "checkbox"},
                {name: "lst", value: 'spain', type: "select", options: ['france', 'spain', 'italy', 'germany'], when: 'opt'},
                {name: "txt", value: 'Not editable', type: "textfield", when: "opt && lst==='italy'", disabled: true}
            ],
            isFilter: () => false
        };
        const ctx = formCtrl.createContext(widget);
        expect(ctx.controls).toHaveLength(3);
        const $form = jQuery(`<div>${ctx.controls.join('\n')}</div>`);
        const $optInput = $form.find('[name="opt"]');
        const $lstInput = $form.find('[name="lst"]');
        const $txtInput = $form.find('[name="txt"]');
        const $optControl = $optInput.closest('.form-group');
        const $lstControl = $lstInput.closest('.form-group');
        const $txtControl = $txtInput.closest('.form-group');
        // check initial values
        expect($optInput.prop('checked')).toBe(false);
        expect($lstInput.val()).toBe('spain');
        expect($txtInput.val()).toBe('Not editable');
        formCtrl.applyFieldWatchers($form, widget.defaults, widget, false);
        expect(mockUserStorage.setToLocal).not.toHaveBeenCalled();

        
        // Expect only the first element to be visible
        expect($optControl.css('display')).toBe('block');
        expect($lstControl.css('display')).toBe('none');
        expect($txtControl.css('display')).toBe('none');

        // Click on the checkbox
        $optInput.prop("checked", true).change();
        await wait(500);
        expect($lstControl.css('display')).toBe('block');
        expect($txtControl.css('display')).toBe('none');

        // Select the italy option
        $lstControl.val('italy');
        $lstControl.find('option[value=spain]').attr('selected', false);
        $lstControl.find('option[value=italy]').attr('selected', true);
        $lstControl.change(); // Problem doUpdateVisibilities not called????
        $optInput.change();
        await wait(500);
        expect($lstControl.css('display')).toBe('block');
        expect($txtControl.css('display')).toBe('block');

        // Click on the checkbox again
        $optInput.prop("checked", false).change();
        await wait(500);
        // Expect only the first element to be visible
        expect($optControl.css('display')).toBe('block');
        expect($lstControl.css('display')).toBe('none');
        expect($txtControl.css('display')).toBe('none');
    });
});