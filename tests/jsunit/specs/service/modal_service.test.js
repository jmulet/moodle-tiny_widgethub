/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const { ModalSrv } = require('../../src/service/modal_service');
console.log(ModalSrv);

/** @type {ModalSrv | undefined} */
let modalSrv;

describe('ModalSrv', () => {
    beforeEach(() => {
        modalSrv = new ModalSrv();
    });

    it('It must create', () => {
        expect(modalSrv).toBeTruthy();
    });

    test.each([
        ['picker'],
        ['params'],
        ['context']
    ])('It must create a modal of type %s without hidden cb', async (/** @type {any} */ type) => {
        const modal = await modalSrv?.create(type, {});
        expect(modal).toBeTruthy();
        expect(modal?.getRoot()?.on).not.toHaveBeenCalled();
    });

    test.each([
        ['picker'],
        ['params'],
        ['context']
    ])('It must create a modal of type %s with hidden cb', async (/** @type {any} */ type) => {
        const cb = () => { };
        const modal = await modalSrv?.create(type, {}, cb);
        expect(modal).toBeTruthy();
        expect(modal?.getRoot()?.on).toHaveBeenCalledWith("hidden", expect.any(Function));
    });
});

describe('ModalTracker functionality', () => {
    /** @type {any} */
    let modalSrv;
    /** @type {any} */
    let modal;

    beforeEach(async () => {
        modalSrv = new ModalSrv();
        // Create a real modal instance (using one of the registered types)
        modal = await modalSrv.create('picker', {});
        console.log(modal);
    });

    it('should register a listener and remove it on destroy', () => {
        const handler = jest.fn();
        const eventName = 'click';
        const element = document.createElement('button');

        // Spy on addEventListener and removeEventListener
        const addSpy = jest.spyOn(element, 'addEventListener');
        const removeSpy = jest.spyOn(element, 'removeEventListener');

        // Register listener
        modal.twhRegisterListener(element, eventName, handler);

        expect(addSpy).toHaveBeenCalledWith(eventName, handler);

        // Trigger event to verify handler is attached (optional, but good)
        element.dispatchEvent(new Event(eventName));
        expect(handler).toHaveBeenCalled();

        // Destroy modal
        modal.destroy();

        expect(removeSpy).toHaveBeenCalledWith(eventName, handler);
    });

    it('should not register duplicate listeners', () => {
        const handler = jest.fn();
        const eventName = 'click';
        const element = document.createElement('button');
        const addSpy = jest.spyOn(element, 'addEventListener');

        modal.twhRegisterListener(element, eventName, handler);
        modal.twhRegisterListener(element, eventName, handler);

        expect(addSpy).toHaveBeenCalledTimes(1);
    });

    it('should register listener by selector', () => {
        const container = document.createElement('div');
        const button = document.createElement('button');
        button.className = 'target-btn';
        container.appendChild(button);

        const handler = jest.fn();
        const addSpy = jest.spyOn(button, 'addEventListener');

        modal.twhRegisterListenerBySelector(container, '.target-btn', 'click', handler);

        expect(addSpy).toHaveBeenCalledWith('click', handler);
    });

    it('should not register listener by selector if element not found', () => {
        const container = document.createElement('div');
        const handler = jest.fn();

        // Should not throw
        modal.twhRegisterListenerBySelector(container, '.non-existent', 'click', handler);
    });
});