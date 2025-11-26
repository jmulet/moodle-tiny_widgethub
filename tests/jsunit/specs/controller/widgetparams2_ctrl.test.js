/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { WidgetParamsCtrl } from "../../src/controller/widgetparams_ctrl";

describe("WidgetParamsCtrl Suite II", () => {
    /** @type {any} */
    let editor;
    /** @type {any} */
    let userStorage;
    /** @type {any} */
    let templateSrv;
    /** @type {any} */
    let modalSrv;
    /** @type {any} */
    let formCtrl;
    /** @type {any} */
    let applyWidgetFilter;
    /** @type {any} */
    let widget;
    /** @type {any} */
    let widgetParamsCtrl;
    /** @type {any} */
    let mockModal;

    beforeEach(() => {
        editor = global.Mocks.editorFactory();
        userStorage = {
            getRecentUsed: jest.fn().mockReturnValue([]),
            setToSession: jest.fn(),
        };
        templateSrv = {
            render: jest.fn().mockResolvedValue('rendered_template'),
        };
        mockModal = {
            body: Object.assign([], {
                find: jest.fn().mockReturnValue({
                    on: jest.fn(),
                    html: jest.fn()
                }),
                popover: jest.fn()
            }),
            footer: {
                show: jest.fn(),
                find: jest.fn().mockReturnValue({
                    on: jest.fn()
                })
            },
            show: jest.fn(),
            hide: jest.fn(),
            destroy: jest.fn(),
            twhRegisterListener: jest.fn()
        };
        modalSrv = {
            create: jest.fn().mockResolvedValue(mockModal),
        };
        formCtrl = {
            createContext: jest.fn().mockReturnValue({ idtabpane: 'tab1' }),
            extractFormParameters: jest.fn().mockReturnValue({ p1: 'val1' }),
            attachRepeatable: jest.fn(),
            attachPickers: jest.fn(),
            applyFieldWatchers: jest.fn(),
        };
        applyWidgetFilter = jest.fn();
        widget = {
            key: 'w1',
            name: 'Widget 1',
            defaults: { p1: 'def1' },
            parameters: [],
            prop: jest.fn(),
            isFilter: jest.fn().mockReturnValue(false),
            template: 'template_string'
        };

        widgetParamsCtrl = new WidgetParamsCtrl(
            editor,
            userStorage,
            templateSrv,
            modalSrv,
            formCtrl,
            applyWidgetFilter,
            widget
        );
    });

    describe("handleAction", () => {
        it("should create and show modal", async () => {
            await widgetParamsCtrl.handleAction();

            expect(modalSrv.create).toHaveBeenCalledWith('params', expect.any(Object), expect.any(Function));
            expect(formCtrl.createContext).toHaveBeenCalledWith(widget);
            expect(formCtrl.attachRepeatable).toHaveBeenCalled();
            expect(formCtrl.attachPickers).toHaveBeenCalled();
            expect(formCtrl.applyFieldWatchers).toHaveBeenCalled();
            expect(mockModal.show).toHaveBeenCalled();
        });

        it("should attach listeners to modal buttons", async () => {
            await widgetParamsCtrl.handleAction();

            // Verify footer buttons listeners
            expect(mockModal.footer.find).toHaveBeenCalledWith("button.tiny_widgethub-btn-secondary");
            expect(mockModal.footer.find).toHaveBeenCalledWith("button.tiny_widgethub-btn-primary");
        });
    });

    describe("generateInterpolatedCode", () => {
        it("should render template with context", async () => {
            const ctx = { p1: 'newval' };
            const code = await widgetParamsCtrl.generateInterpolatedCode(ctx);

            expect(templateSrv.render).toHaveBeenCalledWith(
                widget.template,
                expect.objectContaining({ p1: 'newval' }),
                undefined,
                undefined
            );
            expect(code).toBe('rendered_template');
        });

        it("should handle insertion query with replace mode", async () => {
            widget.insertquery = "r! .target";
            editor.selection.getContent.mockReturnValue("Selected Text");
            templateSrv.render.mockResolvedValue('<div class="wrapper"><div class="target">Replace Me</div></div>');

            const code = await widgetParamsCtrl.generateInterpolatedCode({});

            expect(code).toContain('Selected Text');
            expect(code).not.toContain('Replace Me');
        });

        it("should handle insertion query with insert mode", async () => {
            widget.insertquery = ".target";
            editor.selection.getContent.mockReturnValue("Selected Text");
            templateSrv.render.mockResolvedValue('<div class="wrapper"><div class="target"></div></div>');

            const code = await widgetParamsCtrl.generateInterpolatedCode({});

            expect(code).toContain('<div class="target">Selected Text</div>');
        });
    });

    describe("insertWidget", () => {
        it("should insert content into editor", async () => {
            await widgetParamsCtrl.insertWidget({ p1: 'val' });

            expect(editor.selection.setContent).toHaveBeenCalledWith('rendered_template');
            expect(editor.focus).toHaveBeenCalled();
        });

        it("should update recent used list", async () => {
            await widgetParamsCtrl.insertWidget({ p1: 'val' });

            expect(userStorage.setToSession).toHaveBeenCalledWith(
                "recent",
                expect.stringContaining(widget.key),
                true
            );
        });

        it("should apply filter if widget is a filter", async () => {
            widget.isFilter.mockReturnValue(true);

            await widgetParamsCtrl.insertWidget({ p1: 'val' });

            expect(applyWidgetFilter).toHaveBeenCalled();
            expect(editor.selection.setContent).not.toHaveBeenCalled();
        });
    });
});
