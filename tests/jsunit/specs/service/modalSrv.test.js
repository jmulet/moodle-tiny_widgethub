import { ModalSrv } from "../../src/service/modalSrv";

// Mock virtual modules
jest.mock("core/modal", () => ({
    __esModule: true,
    default: class {
        registerEventListeners() {
        }
    }
}), { virtual: true });

jest.mock("core/modal_registry", () => ({
    __esModule: true,
    default: {
        register: jest.fn()
    }
}), { virtual: true });

jest.mock("core/modal_factory", () => ({
    __esModule: true,
    default: {
        create: () => {
            const _onFn = jest.fn();
            return Promise.resolve({                
                getRoot: () => ({
                    on: _onFn
                })
            })
        }
    }
}), { virtual: true });

jest.mock("core/modal_events", () => ({
    __esModule: true,
    default: {
        hidden: "hidden"
    }
}), { virtual: true });

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