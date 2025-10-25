/**
 * @jest-environment jsdom
 */

require('../module.mocks')(jest);
const { htmlToElement } = require('../../src/util');
// Actual form implementation
const {getFormCtrl} = require('../../src/controller/form_ctrl');

const {WidgetPropertiesCtrl, getWidgetPropertiesCtrl} = 
    require("../../src/controller/widgetproperties_ctrl");

/** @type {*} */
let mockEditor;

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

/** @type {*} */
const widget = {
    key: "key",
    name: "widget-name",
    defaults: {p1: "a", p2: 11},
    parameters: [
        {name: "p1", value: "", type: "textfield", bind: "attr('title')"},
        {name: "p2", value: "", type: "textarea"},
        {name: "p3", value: 0, type: "numeric"},
        {name: "p4", value: false, type: "checkbox", bind: "hasClass('somecls')"},
        {name: "p5", value: "#000000", type: "color"},
        {name: "p6", value: "", type: "select", options: ["a", "b", "c"]},
    ],
    isFilter: () => false,
    hasBindings: () => true
};

/** @type {*} */
const mockModalSrv = require('../modal_service.mock');


/** @type {WidgetPropertiesCtrl} */
let widgetPropertiesCtrl;

describe("WidgetPickerCtrl", () => {

    beforeEach(() => {
        mockEditor = require('../editor.mock')();
        // Use the real formCtrl
        const formCtrl = getFormCtrl(mockEditor);
        widgetPropertiesCtrl = new WidgetPropertiesCtrl(mockEditor, formCtrl, mockModalSrv);
    })

    it("It must create", () => {
        expect(widgetPropertiesCtrl).toBeTruthy();
    });

    it("Must create from cache", () => {
        const instance1 = getWidgetPropertiesCtrl(mockEditor);
        const instance2 = getWidgetPropertiesCtrl(mockEditor);
        const instance3 = getWidgetPropertiesCtrl({...mockEditor, id: 234});
        expect(instance1).toBeTruthy();
        expect(Object.is(instance1, instance2)).toBe(true);
        expect(Object.is(instance1, instance3)).toBe(false)
    });

    it("Must show the dialog for the current context and do changes", async() => {
        /** @type {*} */
        let currentContext;
        const consoleSpy = jest.spyOn(global.console, 'error');

        currentContext = {}
        widgetPropertiesCtrl.show(currentContext);
        expect(consoleSpy).toHaveBeenCalledWith("Missing widget on currentContext");
        expect(mockModalSrv.create).not.toHaveBeenCalled();

        currentContext = {
            widget: {
                hasBindings: () => false
            },
            elem: htmlToElement('<span></span>')
        };
        widgetPropertiesCtrl.show(currentContext);
        expect(consoleSpy).toHaveBeenCalledWith("Invalid widget definition ", currentContext.widget);
        expect(mockModalSrv.create).not.toHaveBeenCalled();

        consoleSpy.mockClear();

        const elem = htmlToElement('<span></span>');
        currentContext = {
            widget,
            elem
        };
        await widgetPropertiesCtrl.show(currentContext);

        const modal = widgetPropertiesCtrl.modal;
        const body = modal?.body;
        expect(body).toBeTruthy();
        // Expect that the modal has 2 bind properties
        expect(body?.find(".form-group")).toHaveLength(2);

        // @ts-ignore (Just a mock addon)
        modal?.setFormValues({
            p1: 'The title here',
            p4: true
        });

        // Accept the form
        widgetPropertiesCtrl.modal?.footer.find("button.tiny_widgethub-btn-primary").trigger('click');
        // Check that the elem has been updated accordingly
        expect(elem.title).toBe('The title here');
        expect(elem.classList.contains('somecls')).toBe(true);
        expect(mockEditor.setDirty).not.toHaveBeenCalled();
    });

    it("Must show the dialog for the current context and cancel changes", async() => {
        /** @type {import('../../src/contextinit').PathResult} */
        let currentContext;
        const consoleSpy = jest.spyOn(global.console, 'error');
        mockEditor.setDirty.mockReset();
       
        const elem = htmlToElement('<span title="none"></span>');
        currentContext = {
            widget,
            elem,
            selectedElement: elem
        };
        await widgetPropertiesCtrl.show(currentContext);
        // expect(consoleSpy).not.toHaveBeenCalled();

        const modal = widgetPropertiesCtrl.modal;
        const body = modal?.body;
        expect(body).toBeTruthy();
        // Expect that the modal has 2 bind properties
        expect(body?.find(".form-group")).toHaveLength(2);

        // @ts-ignore (Just a mock addon)
        modal?.setFormValues({
            p1: 'The title here',
            p4: true
        });

        // Accept the form
        widgetPropertiesCtrl.modal?.footer.find("button.btn-secondary").trigger('click');
        // Check that the elem has been not been updated
        expect(elem.title).toBe('none');
        expect(elem.classList.contains('somecls')).toBe(false);
        expect(mockEditor.setDirty).not.toHaveBeenCalled();
    });

});