const actualPath = '../src/options';

let actual = jest.requireActual(actualPath);

const mock = {};
const wrappers = {};

const syncWrappers = () => {
    Object.entries(wrappers).forEach(([key, wrapper]) => {
        wrapper.prototype = actual[key].prototype;
        Object.setPrototypeOf(wrapper, actual[key]);
    });
};

Object.keys(actual).forEach((key) => {
    const value = actual[key];
    if (typeof value !== 'function') {
        Object.defineProperty(mock, key, {
            configurable: true,
            enumerable: true,
            get: () => actual[key],
        });
        return;
    }
    const wrapper = function (...args) {
        if (new.target) {
            return Reflect.construct(actual[key], args);
        }
        return actual[key](...args);
    };
    wrapper.prototype = value.prototype;
    Object.setPrototypeOf(wrapper, value);
    wrappers[key] = wrapper;
    mock[key] = wrapper;
});

/**
 * Replace the wrapped options module used by the test helpers.
 * @param {any} newActual
 */
const setActualOptions = (newActual) => {
    actual = newActual;
    syncWrappers();
};

if (!globalThis.__widgethubOptionMocks) {
    globalThis.__widgethubOptionMocks = [];
}
globalThis.__widgethubOptionMocks.push(setActualOptions);

module.exports = mock;
