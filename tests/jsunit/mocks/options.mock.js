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
 * Test-only helper to populate the shared cache without an AJAX call.
 *
 * @param {object} data
 * @param {import('../src/options').RawWidget[]} [data.widgetList]
 * @param {Record<string, any>} [data.partials]
 * @param {string} [data.additionalcss]
 * @param {Record<string, any>} [data.cfg]
 * @returns {Promise<void>}
 */
mock._resetCacheForTesting = (data = {}) => {
    jest.isolateModules(() => {
        const ajax = require('core/ajax');
        ajax.call.mockReturnValueOnce([Promise.resolve({
            widgetlist: JSON.stringify(data.widgetList ?? []),
            partials: JSON.stringify(data.partials ?? {}),
            additionalcss: data.additionalcss ?? '',
            cfg: JSON.stringify(data.cfg ?? {}),
        })]);
        actual = jest.requireActual(actualPath);
        syncWrappers();
    });
    return actual.fetchEditorData(-1);
};

module.exports = mock;
