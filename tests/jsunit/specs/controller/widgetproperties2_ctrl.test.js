/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const { htmlToElement } = require('../../src/util');
const { getFormCtrl } = require('../../src/controller/form_ctrl');
const { WidgetPropertiesCtrl } = require("../../src/controller/widgetproperties_ctrl");

describe("WidgetPropertiesCtrl - Additional Coverage", () => {
    /** @type {any} */
    let mockEditor;
    /** @type {any} */
    let mockModalSrv;
    /** @type {any} */
    let widgetPropertiesCtrl;
    /** @type {any} */
    let formCtrl;

    beforeEach(() => {
        mockEditor = global.Mocks.editorFactory();
        mockModalSrv = global.Mocks.modalSrv;
        formCtrl = getFormCtrl(mockEditor);
        widgetPropertiesCtrl = new WidgetPropertiesCtrl(mockEditor, formCtrl, mockModalSrv);
    });

    it("should handle repeatable parameters with item_selector (Strategy 1)", async () => {
        const widget = {
            name: "repeatable-widget",
            hasBindings: () => true,
            parameters: [
                {
                    name: "items",
                    type: "repeatable",
                    item_selector: ".item",
                    fields: [
                        { name: "sub1", type: "textfield", bind: "attr('data-val', '.sub1')" }
                    ]
                }
            ]
        };

        const elem = htmlToElement(document, `
            <div>
                <div class="item"><span class="sub1" data-val="Value 1">Value 1</span></div>
                <div class="item"><span class="sub1" data-val="Value 2">Value 2</span></div>
            </div>
        `);

        const currentContext = { widget, elem };

        await widgetPropertiesCtrl.show(currentContext);

        const modal = widgetPropertiesCtrl.modal;
        expect(modal).toBeTruthy();

        // Simulate form submission with new values
        // We need to mock how formCtrl extracts values or manually trigger the update logic
        // The controller uses formCtrl.extractFormParameters. Let's mock the result of that if possible,
        // or rely on the fact that we are testing the 'update parameter values back to DOM' logic in the click handler.

        // We can manually invoke the click handler's logic or mock the form element interaction.
        // Since we want to test lines 187-199 (Strategy 1 update), we need to ensure 'updatedValues' has the correct structure.

        // Mock formCtrl.extractFormParameters to return changed values
        jest.spyOn(formCtrl, 'extractFormParameters').mockReturnValue({
            items: [
                { sub1: "New Value 1" },
                { sub1: "New Value 2" }
            ]
        });

        // Trigger save
        modal.footer.find("button.tiny_widgethub-btn-primary").trigger('click');

        // Verify DOM updates
        const items = elem.querySelectorAll('.item');
        expect(items[0].querySelector('.sub1')?.getAttribute('data-val')).toBe("New Value 1");
        expect(items[1].querySelector('.sub1')?.getAttribute('data-val')).toBe("New Value 2");
    });

    it("should handle repeatable parameters with object bind (Strategy 2)", async () => {
        const widget = {
            name: "repeatable-widget-strategy-2",
            hasBindings: () => true,
            parameters: [
                {
                    name: "list",
                    type: "repeatable",
                    bind: {
                        getValue: "(elem) => elem.querySelector('ul').outerHTML",
                        setValue: "(elem, value) => { elem.querySelector('ul').outerHTML = value; }"
                    }
                }
            ]
        };

        const elem = htmlToElement(document, `<div><ul><li>Original</li></ul></div>`);
        const currentContext = { widget, elem };

        await widgetPropertiesCtrl.show(currentContext);

        const modal = widgetPropertiesCtrl.modal;
        expect(modal).toBeTruthy();

        // Mock formCtrl.extractFormParameters
        jest.spyOn(formCtrl, 'extractFormParameters').mockReturnValue({
            list: "<ul><li>Updated</li></ul>"
        });

        // Trigger save
        modal.footer.find("button.tiny_widgethub-btn-primary").trigger('click');

        // Verify DOM updates (Strategy 2 goes to else block line 200)
        expect(elem.querySelector('ul')?.outerHTML).toBe("<ul><li>Updated</li></ul>");
    });

    it("should handle close method", () => {
        widgetPropertiesCtrl.modal = { destroy: jest.fn() };
        widgetPropertiesCtrl.close();
        expect(widgetPropertiesCtrl.modal.destroy).toHaveBeenCalled();
    });

    it("should handle popover failure gracefully", async () => {
        const widget = {
            name: "simple-widget",
            hasBindings: () => true,
            parameters: [{ name: "p1", type: "textfield", bind: "attr('title')" }]
        };
        const elem = htmlToElement(document, '<div title="test"></div>');

        // Mock modal.body.popover to throw
        const originalCreate = mockModalSrv.create;
        mockModalSrv.create = jest.fn().mockImplementation(async (type, data, destroyCallback) => {
            const modal = await originalCreate(type, data, destroyCallback);
            modal.body.popover = () => { throw new Error("Popover error"); };
            return modal;
        });

        await widgetPropertiesCtrl.show({ widget, elem });

        // Should not crash
        expect(widgetPropertiesCtrl.modal).toBeTruthy();

        // Restore mock
        mockModalSrv.create = originalCreate;
    });

    it("should ignore undefined values during update", async () => {
        const widget = {
            name: "simple-widget",
            hasBindings: () => true,
            parameters: [{ name: "p1", type: "textfield", bind: "attr('title')" }]
        };
        const elem = htmlToElement(document, '<div title="test"></div>');

        await widgetPropertiesCtrl.show({ widget, elem });

        // Mock extractFormParameters to return undefined for p1
        jest.spyOn(formCtrl, 'extractFormParameters').mockReturnValue({ p1: undefined });

        widgetPropertiesCtrl.modal.footer.find("button.tiny_widgethub-btn-primary").trigger('click');

        // DOM should remain unchanged
        expect(elem.getAttribute('title')).toBe('test');
    });
});
