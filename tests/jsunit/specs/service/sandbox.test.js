/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/sandbox
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

jest.unmock('../../src/service/sandbox');
const { Sandbox, RemoteDom } = require('../../src/service/sandbox');

// Mock Moodle core modules
jest.mock('core/config', () => ({
    wwwroot: 'http://localhost/moodle',
    jsrev: 1
}), { virtual: true });

jest.mock('core/templates', () => ({
    render: jest.fn().mockResolvedValue('<html><body>Ready</body></html>')
}), { virtual: true });

// Mock util
jest.mock('../../src/util', () => ({
    genID: jest.fn(() => 'test-id')
}));

describe('Sandbox', () => {
    /** @type {Sandbox} */
    let sandbox;

    beforeEach(() => {
        // Mock MessageChannel.
        // @ts-ignore
        global.MessageChannel = class {
            constructor() {
                this.port1 = { onmessage: null, close: jest.fn() };
                this.port2 = { postMessage: jest.fn(), onmessage: null, close: jest.fn() };
            }
        };

        // Mock URL and Blob
        global.URL.createObjectURL = jest.fn(() => 'blob:abc');
        global.URL.revokeObjectURL = jest.fn();
        // @ts-ignore
        global.Blob = class { constructor(content) { this.content = content; } };

        sandbox = new Sandbox('test_event');
    });

    afterEach(() => {
        if (sandbox) sandbox.destroy();
        jest.clearAllMocks();
    });

    test('It must create a sandboxed iframe', async () => {
        const promise = sandbox._createSandboxedIframe();

        // Wait for Template.render to resolve and iframe to be appended
        await new Promise(resolve => setTimeout(resolve, 10));

        const iframe = document.body.querySelector('iframe');
        expect(iframe).toBeTruthy();

        // Check sandbox attribute
        const sandboxAttr = iframe?.getAttribute('sandbox');
        expect(sandboxAttr).toContain('allow-scripts');

        // Simulate the 'ready' signal from the iframe
        const event = new MessageEvent('message', {
            data: {
                type: 'tiny_widgethub_test_event_init',
                status: 'ready'
            },
            source: iframe?.contentWindow,
            origin: 'null',
            ports: [new MessageChannel().port1]
        });
        window.dispatchEvent(event);

        const result = await promise;
        expect(result).toBe(iframe);
        expect(sandbox._port2).toBeTruthy();
    });

    test('It must handle task timeouts', async () => {
        // Mock ready state with full port mock
        // @ts-ignore
        sandbox._port2 = {
            postMessage: jest.fn(),
            close: jest.fn()
        };

        jest.useFakeTimers();
        const promise = sandbox.execute('test_type', { foo: 'bar' });

        jest.advanceTimersByTime(Sandbox.EXECUTE_TIMEOUT + 1);

        await expect(promise).rejects.toThrow('Sandbox timeout');
        jest.useRealTimers();
    });
});

describe('RemoteDom', () => {
    /** @type {RemoteDom} */
    let remoteDom;

    beforeEach(() => {
        remoteDom = new RemoteDom('dom_sandbox');
    });

    describe('Security checks', () => {
        test('_isSafeTag blocks dangerous tags', () => {
            expect(remoteDom._isSafeTag('div')).toBe(true);
            expect(remoteDom._isSafeTag('script')).toBe(false);
            expect(remoteDom._isSafeTag('iframe')).toBe(false);
        });

        test('_isSafeAttribute blocks dangerous attributes', () => {
            expect(remoteDom._isSafeAttribute('class', 'foo')).toBe(true);
            expect(remoteDom._isSafeAttribute('onclick', 'alert(1)')).toBe(false);
            expect(remoteDom._isSafeAttribute('id', 'foo')).toBe(false);
        });

        test('_hasDangerousProtocol catches bypasses', () => {
            expect(remoteDom._hasDangerousProtocol('javascript:alert(1)')).toBe(true);
            expect(remoteDom._hasDangerousProtocol('java\x00script:alert(1)')).toBe(true);
            expect(remoteDom._hasDangerousProtocol('vbscript:alert(1)')).toBe(true);
            expect(remoteDom._hasDangerousProtocol('data:image/png;base64,abc')).toBe(false);
        });

        test('_isSafeStyle blocks CSS exploits', () => {
            expect(remoteDom._isSafeStyle('color', 'red')).toBe(true);
            expect(remoteDom._isSafeStyle('background', 'url("javascript:alert(1)")')).toBe(false);
            expect(remoteDom._isSafeStyle('style', '@import "foo.css"')).toBe(false);
        });
    });

    describe('DOM Mutations', () => {
        /** @type {HTMLElement} */
        let root;
        beforeEach(() => {
            root = document.createElement('div');
            root.setAttribute('data-rvn-id', 'root');
            document.body.appendChild(root);
        });

        afterEach(() => {
            if (root && root.parentNode) {
                root.parentNode.removeChild(root);
            }
        });

        test('_applyMutation updates attributes safely', () => {
            /** @type {import('../../src/service/sandbox').Patch} */
            const patch = {
                vid: 'root',
                type: 'attributes',
                name: 'title',
                value: 'hello',
                isDeleted: false
            };
            remoteDom._applyMutation(root, patch);
            expect(root.getAttribute('title')).toBe('hello');
        });

        test('_applyMutation handles style updates', () => {
            const patch = {
                vid: 'root',
                type: 'attributes',
                name: 'style',
                value: 'display: none; width: 100%',
                isDeleted: false
            };
            remoteDom._applyMutation(root, patch);
            expect(root.style.display).toBe('none');
            expect(root.style.width).toBe('100%');
        });

        test('_applyMutation handles node reconciliation', () => {
            const child1 = document.createElement('span');
            child1.setAttribute('data-rvn-id', 'c1');
            root.appendChild(child1);

            /** @type {import('../../src/service/sandbox').Patch} */
            const patch = {
                vid: 'root',
                type: 'nodes',
                name: 'undefined',
                value: 'undefined',
                nodes: [
                    { vId: 'c1' },
                    ['div', { class: 'new' }, ['Hello']]
                ],
                isDeleted: false
            };

            remoteDom._applyMutation(root, patch);
            expect(root.childNodes.length).toBe(2);
            expect(root.childNodes[0]).toBe(child1);
            // @ts-ignore
            expect(root.childNodes[1].tagName).toBe('DIV');
            expect(root.childNodes[1].textContent).toBe('Hello');
        });
    });
});
