
import jQuery from 'jquery';
const util = require('../../src/util');
util.genID = jest.fn().mockReturnValue("a12345");

const { WidgetPickerCtrl, getWidgetPickCtrl } = require("../../src/controller/widgetpicker_ctrl");
const { getTemplateSrv } = require('../../src/service/template_service');

/**
 * @param {number} delay 
 */
const wait = function (delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    })
}

/** @type {*} */
let mockEditor;

/** @type {*} */
const mockUserStorage = {
    getFromLocal: jest.fn().mockReturnValue(""),
    getFromSession: jest.fn().mockReturnValue(""),
    setToSession: jest.fn(),
    setToLocal: jest.fn(),
    getRecentUsed: jest.fn().mockReturnValue([]),
    loadStore: jest.fn()
};

/** @type {*} */
const mockTemplateSrv = {
    render: jest.fn().mockResolvedValue("PREVIEW_HTML"),
    renderMustache: jest.fn(),
    renderEJS: jest.fn()
};

/** @type {*} */
const widget1 = {
    key: 'k1',
    name: "widget k1",
    defaults: { p1: "a", p2: 11 },
    defaultsWithRepeatable: jest.fn().mockReturnValue({ p1: "a", p2: 11 }),
    isSelectCapable: jest.fn().mockReturnValue(false),
    template: "<p>Hello</p>",
    parameters: [],
    prop: (/** @type {any} */ key) => undefined,
    isUsableInScope: () => true,
    isFilter: () => false,
    _preview: "PREVIEW_HTML"
};

/** @type {any} */
const mockEditorOptions = {
    widgetDict: {
        "k1": widget1
    }
};

const mockModalSrv = {
    create: jest.fn()
};

const mockWidgetParamsFactory = jest.fn().mockReturnValue({
    insertWidget: jest.fn(),
    handleAction: jest.fn()
});

/** @type {WidgetPickerCtrl} */
let widgetPickCtrl;

describe("WidgetPickerCtrl Preview Events", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockEditor = global.Mocks.editorFactory();
        widgetPickCtrl = new WidgetPickerCtrl(mockEditor, mockEditorOptions,
            mockWidgetParamsFactory, mockModalSrv, mockTemplateSrv, mockUserStorage);
    });

    it("Should handle mouse events correctly for preview", async () => {
        // Setup DOM
        const btnGroup = document.createElement("div");
        btnGroup.classList.add("tiny_widgethub-btn-group");
        btnGroup.dataset.key = "k1";

        const button = document.createElement("button");
        button.classList.add("tiny_widgethub-btn");

        const icon = document.createElement("span");
        icon.classList.add("icon");
        icon.textContent = "Icon";

        const text = document.createElement("span");
        text.classList.add("text");
        text.textContent = "Widget Name";

        button.appendChild(icon);
        button.appendChild(text);
        btnGroup.appendChild(button);

        const previewDiv = document.createElement("div");
        previewDiv.classList.add("tiny_widgethub-preview");
        previewDiv.style.display = "none";

        const modalBody = document.createElement("div");
        modalBody.appendChild(btnGroup);
        modalBody.appendChild(previewDiv);

        // Mock modal creation to attach events
        mockModalSrv.create.mockResolvedValue({
            body: jQuery(modalBody),
            header: jQuery("<div></div>"),
            show: jest.fn()
        });

        await widgetPickCtrl.createModal();

        // Verify initial state
        expect(previewDiv.style.display).toBe("none");

        // Simulate mouseenter on button
        const mouseEnterEvent = new MouseEvent('mouseenter', {
            bubbles: false,
            cancelable: true,
            view: window
        });
        button.dispatchEvent(mouseEnterEvent);

        // Wait for debounce/timeout in funEnter (500ms)
        await wait(600);

        // Preview should be visible
        expect(previewDiv.style.display).toBe("block");
        expect(previewDiv.innerHTML).toBe("PREVIEW_HTML");

        // Simulate mouseout to child (text span)
        // In the buggy implementation (mouseout), this might trigger hide if not handled correctly
        // We want to verify if it hides or stays.
        // The issue description says: "it does not trigger if the mouse is over the text which is an span inside button"
        // This implies that moving mouse OVER the text (which is technically entering the text and leaving the button layer? No, it bubbles)
        // actually, mouseout fires when leaving the element OR when entering a child.

        const mouseOutToChildEvent = new MouseEvent('mouseout', {
            bubbles: true,
            cancelable: true,
            view: window,
            relatedTarget: text // Moving to child
        });

        // We need to manually trigger the handler because JSDOM might not fully simulate the complex bubbling/relatedTarget logic of mouseout vs mouseleave perfectly for all edge cases, 
        // but let's try dispatching it to the button.
        button.dispatchEvent(mouseOutToChildEvent);

        // Wait for debounce/timeout in funOut (500ms)
        await wait(600);

        // IF the bug exists, the preview might be hidden now.
        // If fixed (using mouseleave), it should still be visible.

        // For the purpose of reproduction, we assert what we expect AFTER the fix.
        // If this fails now, it confirms the bug.
        expect(previewDiv.style.display).toBe("block");

        // Now simulate real mouse leave (moving away from button)
        const mouseLeaveEvent = new MouseEvent('mouseleave', {
            bubbles: false, // mouseleave does not bubble
            cancelable: false,
            view: window,
            relatedTarget: document.body // Moving outside
        });
        button.dispatchEvent(mouseLeaveEvent);

        await wait(600);
        expect(previewDiv.style.display).toBe("none");
    });
});
