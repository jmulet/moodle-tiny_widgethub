
import { enableIframeBubble } from "../../src/extension/iframebubble";

describe("iframebubble", () => {
    /** @type {any} */
    let editor;
    /** @type {any} */
    let mockDom;

    beforeEach(() => {
        mockDom = {
            addStyle: jest.fn(),
            select: jest.fn().mockReturnValue([]),
            addClass: jest.fn(),
            removeClass: jest.fn(),
        };
        editor = {
            dom: mockDom,
            on: jest.fn(),
            selection: {
                select: jest.fn(),
            },
        };
    });

    it("should inject CSS styles on initialization", () => {
        enableIframeBubble(editor);
        expect(mockDom.addStyle).toHaveBeenCalledWith(expect.stringContaining("iframe {"));
        expect(mockDom.addStyle).toHaveBeenCalledWith(expect.stringContaining("pointer-events: none;"));
    });

    it("should attach click and focus listeners", () => {
        enableIframeBubble(editor);
        expect(editor.on).toHaveBeenCalledWith("click", expect.any(Function));
        expect(editor.on).toHaveBeenCalledWith("focus", expect.any(Function));
    });

    describe("interaction logic", () => {
        /** @type {any} */
        let clickHandler;
        /** @type {any} */
        let focusHandler;

        beforeEach(() => {
            enableIframeBubble(editor);
            // Extract the registered handlers
            const calls = editor.on.mock.calls;
            clickHandler = calls.find((/** @type {string[]} */ call) => call[0] === "click")[1];
            focusHandler = calls.find((/** @type {string[]} */ call) => call[0] === "focus")[1];
        });

        it("should deactivate current iframe on focus", () => {
            // Simulate an active iframe
            const iframe = { getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100 }) };
            mockDom.select.mockReturnValue([iframe]);

            // Trigger click with ALT to activate it first (setup state)
            const altClickEvent = {
                altKey: true,
                clientX: 50,
                clientY: 50,
                type: 'click',
                preventDefault: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };
            clickHandler(altClickEvent);
            expect(mockDom.addClass).toHaveBeenCalledWith(iframe, 'twh_iframe-interactive-mode');

            // Now trigger focus
            focusHandler();
            expect(mockDom.removeClass).toHaveBeenCalledWith(iframe, 'twh_iframe-interactive-mode');
        });

        it("should activate iframe when clicked with Alt key", () => {
            const iframe = {
                getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100 })
            };
            mockDom.select.mockReturnValue([iframe]);

            const event = {
                altKey: true,
                clientX: 50,
                clientY: 50,
                type: 'click',
                preventDefault: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };

            clickHandler(event);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopImmediatePropagation).toHaveBeenCalled();
            expect(mockDom.addClass).toHaveBeenCalledWith(iframe, 'twh_iframe-interactive-mode');
        });

        it("should select iframe when clicked without Alt key", () => {
            const iframe = {
                getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100 })
            };
            mockDom.select.mockReturnValue([iframe]);

            const event = {
                altKey: false,
                clientX: 50,
                clientY: 50,
                type: 'click',
                preventDefault: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };

            clickHandler(event);

            expect(editor.selection.select).toHaveBeenCalledWith(iframe);
            expect(mockDom.addClass).not.toHaveBeenCalled();
        });

        it("should deactivate active iframe when clicking elsewhere without Alt", () => {
            // 1. Activate an iframe
            const iframe = { getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100 }) };
            mockDom.select.mockReturnValue([iframe]);

            const altClickEvent = {
                altKey: true,
                clientX: 50,
                clientY: 50,
                type: 'click',
                preventDefault: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };
            clickHandler(altClickEvent);
            expect(mockDom.addClass).toHaveBeenCalledWith(iframe, 'twh_iframe-interactive-mode');
            mockDom.addClass.mockClear();

            // 2. Click elsewhere (no iframe hit)
            const clickEvent = {
                altKey: false,
                clientX: 200,
                clientY: 200,
                type: 'click'
            };
            clickHandler(clickEvent);

            expect(mockDom.removeClass).toHaveBeenCalledWith(iframe, 'twh_iframe-interactive-mode');
        });

        it("should switch active iframe when clicking another with Alt", () => {
            const iframe1 = { getBoundingClientRect: () => ({ left: 0, right: 100, top: 0, bottom: 100 }) };
            const iframe2 = { getBoundingClientRect: () => ({ left: 200, right: 300, top: 0, bottom: 100 }) };
            mockDom.select.mockReturnValue([iframe1, iframe2]);

            // Activate iframe1
            clickHandler({
                altKey: true,
                clientX: 50,
                clientY: 50,
                type: 'click',
                preventDefault: jest.fn(),
                stopImmediatePropagation: jest.fn()
            });
            expect(mockDom.addClass).toHaveBeenCalledWith(iframe1, 'twh_iframe-interactive-mode');

            // Activate iframe2
            clickHandler({
                altKey: true,
                clientX: 250,
                clientY: 50,
                type: 'click',
                preventDefault: jest.fn(),
                stopImmediatePropagation: jest.fn()
            });

            expect(mockDom.removeClass).toHaveBeenCalledWith(iframe1, 'twh_iframe-interactive-mode');
            expect(mockDom.addClass).toHaveBeenCalledWith(iframe2, 'twh_iframe-interactive-mode');
        });
    });
});
