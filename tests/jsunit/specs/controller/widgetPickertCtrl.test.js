/**
 * @jest-environment jsdom
 */
require('../module.mocks')(jest);

const WidgetPickerCtrl = require("../../src/controller/widgetPickerCtrl").WidgetPickerCtrl;

/** @type {*} */
const jQuery = require('jquery');

const mockEditor = {
    id: 12345, 
    selection: {
        getContent: jest.fn().mockImplementation(() => "")
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

/** @type {any} */
const mockEditorOptions = {
    widgetDict: {
        "widget-name": widget
    }
};

const mockModalSrv = {
    create: jest.fn()
};

const mockWidgetParamsFactory = jest.fn();

/** @type {WidgetPickerCtrl} */
let widgetPickCtrl;

describe("WidgetPickerCtrl", () => {

    beforeEach(() => {
        widgetPickCtrl = new WidgetPickerCtrl(mockEditor, mockEditorOptions, 
            mockWidgetParamsFactory, mockModalSrv, mockTemplateSrv, mockUserStorage);
    })

    it("It must create", () => {
        expect(widgetPickCtrl).toBeTruthy();
    });

});