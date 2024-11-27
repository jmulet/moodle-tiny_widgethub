 
/**
 * @jest-environment jsdom
 */
import jQuery from 'jquery';
require('../module.mocks')(jest);

const{WidgetParamsCtrl, getWidgetParamsFactory} = require("../../src/controller/widgetParamsCtrl");
 
/** @type {*} */
let mockEditor;

/** @type {*} */
const mockUserStorage = {
    getFromLocal: jest.fn(),
    getFromSession: jest.fn(),
    getRecentUsed: jest.fn(),
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

/** @type {*} */
const mockFormCtrl = {};


/** @type {*} */
const widget = {
    key: 'k1',
    name: "widget-name",
    defaults: {p1: "a", p2: 11},
    insertquery: ".ins-point",
    parameters: [
        {name: "p1", value: "", type: "textfield"},
        {name: "p2", value: "", type: "textarea"},
        {name: "p3", value: 0, type: "numeric"},
        {name: "p4", value: false, type: "checkbox"},
        {name: "p5", value: "#000000", type: "color"},
        {name: "p6", value: "", type: "select", options: ["a", "b", "c"]},
    ],
    isFilter: () => false,
    prop: () => undefined
};

const mockApplyWidgetFilter = jest.fn();

/** @type {WidgetParamsCtrl} */
let widgetParamsCtrl;

/** @type {*} */
let docSpy;

describe("WidgetParamsCtrl", () => {

    beforeEach(() => {
        jest.clearAllMocks();

        mockEditor = require('../editor.mock')();

        docSpy = jest.spyOn(document, 'createElement');
        widgetParamsCtrl = new WidgetParamsCtrl(mockEditor, mockUserStorage, mockTemplateSrv, mockFileSrv, mockFormCtrl, mockApplyWidgetFilter, widget);
    })

    it("It must create", () => {
        expect(widgetParamsCtrl).toBeTruthy();
    });

    it("It must create every time, no cache here", () => {
        const c1 = getWidgetParamsFactory(mockEditor);
        const c2 = getWidgetParamsFactory(mockEditor);
        expect(c1).toBeTruthy();
        expect(typeof c1).toBe("function");
        expect(Object.is(c1, c2)).toBe(false);

        // The factory always creates new objects
        const inst1 = c1(widget);
        const inst2 = c1(widget);
        expect(inst1).toBeTruthy();
        expect(Object.is(inst1, inst2)).toBe(false);
    });

    it("It must insert the widget given the context from the form", async() => {
        // Set a mock for the recently used widgets
        mockUserStorage.getRecentUsed = jest.fn().mockImplementation(() => {
            return [{key: "awesome", p: {bar: 'some'}}]
        });

        const ctx = {
            p1: 'P1',
            p2: false,
            p3: '#FF00AA'
        };

        const json = JSON.stringify([
            {key: 'k1', p: {...ctx}},
            {key: "awesome", p: {bar: 'some'}}
        ]);

        // Mock the generateInterpolated function
        const spy = jest.spyOn(widgetParamsCtrl, 'generateInterpolatedCode');
        spy.mockResolvedValue("<p>...</p>");

        await widgetParamsCtrl.insertWidget(ctx);
        expect(spy).toHaveBeenCalledWith(ctx);
        expect(mockUserStorage.setToSession).toHaveBeenCalledWith('recent', json, true);
        expect(mockEditor.selection.setContent).toHaveBeenCalledWith('<p>...</p>');
        expect(mockEditor.focus).toHaveBeenCalled();
    });

    it("It must apply the widget filter given the context from the form", async() => {
        // Set a mock for the recently used widgets
        mockUserStorage.getRecentUsed = jest.fn().mockImplementation(() => {
            return [{key: "k1", p: {}}]
        });

        const ctx = {};

        // Redefine the widget to be a filter
        widget.template = 'return "Here there!"';
        widget.isFilter = () => true;
        widget.parameters = undefined;
        widgetParamsCtrl = new WidgetParamsCtrl(mockEditor, mockUserStorage, mockTemplateSrv, mockFileSrv, mockFormCtrl, mockApplyWidgetFilter, widget);

        const json = JSON.stringify([
            {key: 'k1', p: {...ctx}},
        ]);

        // Mock the generateInterpolated function
        const spy = jest.spyOn(widgetParamsCtrl, 'applyWidgetFilter'); 

        await widgetParamsCtrl.insertWidget(ctx);
        expect(spy).toHaveBeenCalledWith(widget.template, false, ctx);
        expect(mockUserStorage.setToSession).toHaveBeenCalledWith('recent', json, true);
        expect(mockEditor.selection.setContent).not.toHaveBeenCalled();
        expect(mockEditor.focus).toHaveBeenCalled();
    });

    it('Must geenrate the preview', async() => {
        const body = jQuery('<div><div id="tab_0"></div><div id="tab_1"></div></div>');
        // @ts-ignore
        widgetParamsCtrl.modal = {
            body
        };
        widgetParamsCtrl.generateInterpolatedCode = jest.fn().mockResolvedValue("<p>The content goes here!</p>");
        const ctxFromDialogue = {p: 123, k: 'ku1'};

        await widgetParamsCtrl.updatePreview('tab', ctxFromDialogue);
        expect(widgetParamsCtrl.generateInterpolatedCode).toHaveBeenCalledWith(ctxFromDialogue);
        expect(body.find('#tab_1').html()).toContain('The content goes here!');
    });

    it('Must generate the interpolated code (without selection) from the form context', async() => {
        // Without any selection
        widgetParamsCtrl.render = jest.fn().mockResolvedValue('<div class="alert"><div class="ins-point">1234-a</div></div>');
        const ctx = {p: 1234, a: 'a'};
        
        const txt = await widgetParamsCtrl.generateInterpolatedCode(ctx);
        expect(mockEditor.selection.getContent).toHaveBeenCalled();
        expect(docSpy).not.toHaveBeenCalled();
        expect(txt).toBe('<div class="alert"><div class="ins-point">1234-a</div></div>');
    });

    it('Must generate the interpolated code (with selection) from the form context', async() => {
        // With a selection
        mockEditor.selection.getContent = jest.fn().mockReturnValue('<p>Hi there!</p>');
        widgetParamsCtrl.render = jest.fn().mockResolvedValue('<div class="alert"><div class="ins-point"></div></div>');
        const ctx = {p: 1234, a: 'a'};
        
        const txt = await widgetParamsCtrl.generateInterpolatedCode(ctx);

        expect(mockEditor.selection.getContent).toHaveBeenCalled();
        expect(docSpy).toHaveBeenCalled();
        expect(txt).toBe('<div class="alert"><div class="ins-point"><p>Hi there!</p></div></div>')
    });

    it('Must generate the interpolated code (with selection & replacement) from the form context', async() => {
        // With a selection & replacement of node
        widget.insertquery = 'r!.ins-point';
        
        mockEditor.selection.getContent = jest.fn().mockReturnValue('<p>Hi there!</p>');
        const ctx = {p: 1234, a: 'a'};

        widgetParamsCtrl = new WidgetParamsCtrl(mockEditor, mockUserStorage, mockTemplateSrv, mockFileSrv, mockFormCtrl, mockApplyWidgetFilter, widget);
        widgetParamsCtrl.render = jest.fn().mockResolvedValue('<div class="alert"><div class="ins-point"></div></div>');
        
        const txt = await widgetParamsCtrl.generateInterpolatedCode(ctx);

        expect(docSpy).toHaveBeenCalled();
        expect(mockEditor.selection.getContent).toHaveBeenCalled();
        expect(txt).toBe('<div class="alert"><p>Hi there!</p></div>')
    });

    it('Must render a template given a context', async() => {

        mockTemplateSrv.render = jest.fn().mockResolvedValue("template");

        const ctx = {a: 'abc'};
        const txt = await widgetParamsCtrl.render(ctx);
        expect(mockTemplateSrv.render).toHaveBeenCalledWith(widgetParamsCtrl.widget.template, expect.any(Object), undefined, undefined);
        expect(txt).toBe('template');
    });


});