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

    it("should handle close method", () => {
        const destroy = jest.fn();
        widgetPropertiesCtrl.modal = { destroy };
        widgetPropertiesCtrl.close();
        expect(destroy).toHaveBeenCalled();
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
