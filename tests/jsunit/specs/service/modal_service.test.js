/**
 * @jest-environment jsdom
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
require('../module.mocks')(jest);

const { ModalSrv } = require('../../src/service/modal_service');

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
    ])('It must create a modal of type %s without hidden cb', async(/** @type {any} */ type) => {
        const modal = await modalSrv?.create(type, {});
        expect(modal).toBeTruthy();
        expect(modal?.getRoot()?.on).not.toHaveBeenCalled();
    });

    test.each([
        ['picker'],
        ['params'],
        ['context']
    ])('It must create a modal of type %s with hidden cb', async(/** @type {any} */ type) => {
        const cb = () => {};
        const modal = await modalSrv?.create(type, {}, cb);
        expect(modal).toBeTruthy();
        expect(modal?.getRoot()?.on).toHaveBeenCalledWith("hidden", expect.any(Function));
    });
});