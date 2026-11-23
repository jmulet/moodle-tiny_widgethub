/**
 * 
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Convert an HTML string into DOM element(s)
 * @param {Document} doc - The page document
 * @param {string} html - HTML string
 * @returns {HTMLElement} - Returns a single element if one root, or a DocumentFragment if multiple
 */
export function htmlToElement(doc, html) {
    const template = doc.createElement('template');
    template.innerHTML = html.trim();

    if (template.content.childElementCount === 1) {
        // @ts-ignore
        return template.content.firstElementChild;
    } else {
        // If multiple root elements, return a fragment
        // @ts-ignore
        return template.content;
    }
}

/**
 * Populate the shared widget cache of the options module without an AJAX call.
 * @param {object} [data]
 * @param {import('./src/options').RawWidget[]} [data.widgetList]
 * @param {Record<string, any>} [data.partials]
 * @param {string} [data.additionalcss]
 * @param {Record<string, any>} [data.cfg]
 * @returns {Promise<void>}
 */
export function _resetCacheForTesting(data = {}) {
    /** @type {any} */
    let actualOptions;
    jest.isolateModules(() => {
        /** @type {any} */
        const ajax = require('core/ajax');
        ajax.call.mockReturnValueOnce([Promise.resolve({
            widgetlist: JSON.stringify(data.widgetList ?? []),
            partials: JSON.stringify(data.partials ?? {}),
            additionalcss: data.additionalcss ?? '',
            cfg: JSON.stringify(data.cfg ?? {}),
        })]);
        actualOptions = jest.requireActual('./src/options');
    });
    (globalThis.__widgethubOptionMocks ?? []).forEach(setActual => setActual(actualOptions));
    return actualOptions.fetchEditorData(-1);
}