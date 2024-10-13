/**
 * @jest-environment jsdom
 */
require('../module.mocks')(jest);

/** @type {Record<string, string>} */
const Templates = require("../../../../amd/src/controller/formCtrl").Templates;

// Make test reproducible
const util = require("../../src/util");

/** @ts-ignore */
const jQuery = require("jquery").default;
const FormCtrl = require("../../src/controller/formCtrl").FormCtrl;

const mockEditor = {
    id: 12345, 
    selection: {
        getContent: jest.fn().mockImplementation(() => "text selected")
    }
};

/** @type {*} */
const mockUserStorage = {
    getFromLocal: () => {
        return undefined;
    },
    getFromSession: () => {
        return undefined;
    }
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
        let _id = 0;
        util.genID = () => {
            _id += 1;
            return (_id) + "";
        };
        formCtrl = new FormCtrl(mockEditor, mockUserStorage, mockTemplateSrv, mockFileSrv, jQuery);
    })

    it("FormCtrl is created", () => {
        expect(formCtrl).not.toBeNull();
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
        expect(ctx.idTabpane).toBeTruthy();
        expect(ctx.selectMode).toBe(true);
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
                <input type="text" data-bar="p1" value="Example">
                <textarea data-bar="p2">A long text in the area</textarea>    
                <input type="number" data-bar="p3" value="1975">
                <input type="checkbox" data-bar="p4" checked>
                <input type="color" data-bar="p5" value="#AABBCC">
                <select data-bar="p6">
                    <option label="L1">a</option>
                    <option label="L2" selected>b</option>
                    <option label="L3">c</option>
                </select>
            </div>`);

        const extracted = formCtrl.extractFormParameters(widget, form);
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
                <input type="text" data-bar="p1" value="   Example  ">
                <textarea data-bar="p2"> A long text in the area   </textarea>    
            </div>`);

        const extracted = formCtrl.extractFormParameters(widget, form);
        expect(extracted).toStrictEqual({
            p1: "Example",
            p2: "A LONG TEXT IN THE AREA"
        });
    });

});