/*
 * @jest-environment jsdom
*/
import jQuery from 'jquery';
require('../module.mocks')(jest);
const util = require('../../src/util');
util.genID = jest.fn().mockReturnValue("a12345");

const {WidgetPickerCtrl, getWidgetPickCtrl, setVisibility}= require("../../src/controller/widgetPickerCtrl");

const mockEditor = {
    id: 12345, 
    selection: {
        getContent: jest.fn().mockImplementation(() => "")
    },
    options: {
        get: jest.fn().mockImplementation(() => 345)
    }
};

/** @type {*} */
const mockUserStorage = {
    getFromLocal: jest.fn().mockReturnValue(""),
    getFromSession: jest.fn().mockReturnValue(""),
    setToSession: jest.fn(),
    getRecentUsed: jest.fn().mockReturnValue([])
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
const widget1 = {
    key: 'k1',
    name: "widget k1",
    defaults: {p1: "a", p2: 11},
    template: "<p>Hello</p>",
    parameters: [
        {name: "p1", value: "", type: "textfield"},
        {name: "p2", value: "", type: "textarea"},
        {name: "p3", value: 0, type: "numeric"},
        {name: "p4", value: false, type: "checkbox"},
        {name: "p5", value: "#000000", type: "color"},
        {name: "p6", value: "", type: "select", options: ["a", "b", "c"]},
    ],
    isUsableInScope: () => true,
    isFilter: () => false
};

const widget2 = {...widget1, key: 'k2', name: 'widget 2', 
    template: '{{p1}}-{{p2}}', category: 'video', parameters: []};

/** @type {any} */
const mockEditorOptions = {
    widgetDict: {
        "k1": widget1,
        "k2": widget2
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
        jest.clearAllMocks();
        widgetPickCtrl = new WidgetPickerCtrl(mockEditor, mockEditorOptions, 
            mockWidgetParamsFactory, mockModalSrv, mockTemplateSrv, mockUserStorage);
    })

    it("It must create", () => {
        expect(widgetPickCtrl).toBeTruthy();
    });

    it("Must getWidgetPickCtrl from cache", () => {
        const i1 = getWidgetPickCtrl(mockEditor);
        const i2 = getWidgetPickCtrl(mockEditor);
        expect(i1).toBeTruthy();
        expect(Object.is(i1, i2)).toBe(true);
        const i3 = getWidgetPickCtrl({...mockEditor, id: 123456});
        expect(Object.is(i1, i3)).toBe(false)
    });

    it("Must toggle the visibility of an element", () => {
        const elem = document.createElement("DIV");
        elem.classList.add("alert");
        expect(setVisibility(elem, true));
        expect(elem.classList.contains("d-none")).toBe(false);
        expect(setVisibility(elem, false));
        expect(elem.classList.contains("d-none")).toBe(true);
        expect(setVisibility(elem, true));
        expect(elem.classList.contains("d-none")).toBe(false);
    });

    it("isSelectMode returns true if the editor has some text selected", () => {
        mockEditor.selection.getContent = jest.fn();
        mockEditor.selection.getContent.mockReturnValue("   ");
        expect(widgetPickCtrl.isSelectMode()).toBe(false);
        mockEditor.selection.getContent.mockClear();
        mockEditor.selection.getContent.mockReturnValue("Some text selected");
        expect(widgetPickCtrl.isSelectMode()).toBe(true);
    });
    
    it("setWidgetButtonsVisibility applies search condition", () => {
        document.body.innerHTML = `
        <div id="modal">
            <input>
            <div class="tiny_widgethub-emptylist"></div>
            <div class="tiny_widgethub-category">
                <div class="btn-group" data-selectable="true" data-key="k1">
                    <button title="Boxes">Example box</button>
                </div>
                <div class="btn-group" data-selectable="true" data-key="k2">
                    <button title="Boxes">Important box</button>
                </div>
            </div>
            <div class="tiny_widgethub-category">
                <div class="btn-group" data-key="k3">
                    <button title="Videos">Insert YouTube</button>
                </div>
            </div>
        </div>
        `;
        mockEditor.selection.getContent.mockClear();
        mockEditor.selection.getContent.mockReturnValue("");
        
        const $modalBody = jQuery("#modal");
        // @ts-ignore
        widgetPickCtrl.modal = {
            body: $modalBody
        };
        const $empty = $modalBody.find(".tiny_widgethub-emptylist");
        const $input = $modalBody.find("input");
        $input.val("   ");

        expect(widgetPickCtrl.isSelectMode()).toBe(false);
        widgetPickCtrl.onSearchKeyup();
        expect(mockUserStorage.setToSession).toHaveBeenCalledWith('searchtext', '   ', true);
        expect($modalBody.find('div[data-key]:not(.d-none)').length).toBe(3);
        expect($modalBody.find('div.tiny_widgethub-category:not(.d-none)').length).toBe(2);
        expect($empty.hasClass("d-none")).toBe(true);
        
        $input.val("  ViDEos  ");
        widgetPickCtrl.onSearchKeyup();
        expect(mockUserStorage.setToSession).toHaveBeenCalledWith('searchtext', '  ViDEos  ', true);
        expect($modalBody.find('div[data-key]:not(.d-none)').length).toBe(1);
        expect($modalBody.find('div.tiny_widgethub-category:not(.d-none)').length).toBe(1);
        expect($empty.hasClass("d-none")).toBe(true);

        $input.val("  cd c,wec wecw !  ");
        widgetPickCtrl.onSearchKeyup();
        expect($modalBody.find('div[data-key]:not(.d-none)').length).toBe(0);
        expect($modalBody.find('div.tiny_widgethub-category:not(.d-none)').length).toBe(0);
        expect($empty.hasClass("d-none")).toBe(false);


        // select Mode
        mockEditor.selection.getContent.mockClear();
        mockEditor.selection.getContent.mockReturnValue("Selection"); 
        $input.val("  ViDEos  ");
        widgetPickCtrl.onSearchKeyup();
        expect(mockUserStorage.setToSession).toHaveBeenCalledWith('searchtext', '  ViDEos  ', true);
        expect($modalBody.find('div[data-key]:not(.d-none)').length).toBe(0);
        expect($modalBody.find('div.tiny_widgethub-category:not(.d-none)').length).toBe(0);
        expect($empty.hasClass("d-none")).toBe(false);
    });

    it('getPickTemplateContext returns an object for the given widget list', () => {
        mockEditor.selection.getContent.mockClear();
        mockEditor.selection.getContent.mockReturnValue("");
        
        const ctx = widgetPickCtrl.getPickTemplateContext();
        
        expect(ctx.selectMode).toBe(false);
        expect(ctx.rid).toMatch(/^[a-zA-Z]\w*$/);
        expect(ctx.rid).toBe("a12345");
        expect(ctx.elementid).toBe(mockEditor.id);
        expect(ctx.categories).toHaveLength(2);
        expect(ctx.categories[0].buttons).toHaveLength(1);
        expect(ctx.categories[0].name).toBe('MISC');
        expect(ctx.categories[1].buttons).toHaveLength(1);
    });

    it('handlePickModalAction inserts or displays params modal depending on conditions', () => {
        // @ts-ignore
        widgetPickCtrl.modal = {
            hide: jest.fn()
        };
        // widgetParamsFactory mock
        const insertWidget = jest.fn();
        const handleAction = jest.fn();
        widgetPickCtrl.widgetParamsFactory = jest.fn().mockImplementation(() => {
            return {
                insertWidget,
                handleAction
            };
        });

        widgetPickCtrl.handlePickModalAction(widget1, true);
        expect(insertWidget).toHaveBeenCalledWith({});

        widgetPickCtrl.handlePickModalAction(widget1, false);
        expect(handleAction).toHaveBeenCalled();

        insertWidget.mockReset();
        handleAction.mockReset();
        // No parameters and no instructions
        widgetPickCtrl.handlePickModalAction(widget2, true);
        expect(insertWidget).toHaveBeenCalled();
    });

    it("Must generate preview", async () => {
        widget1.prop = () => undefined;
        mockTemplateSrv.render = jest.fn().mockResolvedValue(widget1.template);
        const preview = await widgetPickCtrl.generatePreview(widget1);
        expect(preview).toBe(widget1.template);
        expect(mockTemplateSrv.render).toHaveBeenCalledWith(widget1.template, widget1.defaults, undefined, undefined);
    });
    
    it("onMouseEnterButton decides how to render preview", async() => {
        const btnGroup = document.createElement("div");
        btnGroup.classList.add("btn-group");
        btnGroup.dataset.key = "k1";
        btnGroup.innerHTML = '<button><i class="fa"></i></button>';

        // @ts-ignore
        widgetPickCtrl.modal = {
            body: jQuery(`<div><div class="tiny_widgethub-preview" style="display: none;"></div></div>`)
        }; 
        widgetPickCtrl.generatePreview = jest.fn().mockReturnValue("The preview");

        await widgetPickCtrl.onMouseEnterButton({target: btnGroup.querySelector("i")});
        expect(widgetPickCtrl.generatePreview).toHaveBeenCalledWith(widget1);
        expect(widgetPickCtrl.modal.body.html()).toContain("The preview");
        expect(widgetPickCtrl.modal.body.find(".tiny_widgethub-preview").css('display')).toBe('block');

    });

    it("Must create modal", async () => {
        mockUserStorage.getFromSession = jest.fn().mockReturnValue("");

        const $modalBody = jQuery(`<div>
            <input><button id="widget-clearfilter-btna12345">X</button>
            <div class="tiny_widgethub-recent"></div>
            <div class="tiny_widgethub-categorycontainer">
            </div>
            </div>`);
        const $modalHeader = jQuery(`<div><span class="ib-blink"></span></div>`);
        const modalShow = jest.fn();
        mockModalSrv.create = jest.fn().mockImplementation(() => {
            return Promise.resolve({
                body: $modalBody,
                header: $modalHeader,
                show: modalShow
            });
        });

        await widgetPickCtrl.createModal();

        expect(widgetPickCtrl.modal).toBeTruthy();

    });

});