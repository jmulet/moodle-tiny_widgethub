/**
 * @jest-environment jsdom
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
// Mock virtual modules
require('../module.mocks')(jest);
const Common = require('../../src/common');
const { addRequires, cleanUnusedRequires } = require('../../src/extension/dependencies');
const editorFactory = require('../editor.mock');
const JSAREACLASSNAME = Common.default.jsAreaClassname;
const jsareaSelector = `div.${JSAREACLASSNAME}`;


const widget1 = {
    key: 'w1',
    selectors: '.w1',
    requires: "https://site.org/w1.js"
};
const widget2 = {
    key: 'w2',
    selectors: ['[role="img"]', 'img'],
    requires: " https://s3.site.org/assets/w2.js  "
};
const widget3 = {
    key: 'w3',
    selectors: ['div[data-prop="w3"]'],
    requires: "http://google.net/w3.min.js"
};
const rawWidgets = [widget1, widget2, widget3];

/**
 * 
 * @param {string} html 
 * @returns {*}
 */
const createEditor = (html) => {
    const editor = editorFactory();
    editor.setContent(html);
    editor.options.get = jest.fn().mockReturnValue(rawWidgets)
    return editor;
};

describe('dependencies', () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });

    it('addRequires on empty document does not modify it', () => {
        const editor = createEditor('<p>empty</p>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().innerHTML).toBe('<p>empty</p>');
    });

    it('addRequires on document with empty area, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="' + JSAREACLASSNAME + '"></div>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeFalsy();
    });

    it('cleanUnusedRequires on document with empty area, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="' + JSAREACLASSNAME + '"></div>');
        expect(editor.getBody().innerHTML).toBe('<p>empty</p><div class="' + JSAREACLASSNAME + '"></div>');
        expect(cleanUnusedRequires(editor)).toBe(1);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeFalsy();
    });

    it('addRequires on document with populated area, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="' + JSAREACLASSNAME + '"><script src="https://site.com/sd/programacio.min.js"></script></div>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeFalsy();
    });

    it('cleanUnusedRequires on document with populated area and no snippet, removes the area', () => {
        const editor = createEditor('<p>empty</p><div class="' + JSAREACLASSNAME + '"><script src="https://site.com/sd/programacio.min.js"></script></div>');
        expect(cleanUnusedRequires(editor)).not.toBe(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeFalsy();
    });

    it('addRequires on document, includes the area and script', () => {
        const editor = createEditor('<div role="img"><img src="https://site.es/img.png"/></div>');
        expect(addRequires(editor, undefined)).not.toBe(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeTruthy();
        expect(editor.dom.create).toHaveBeenCalledTimes(3);
        expect(editor.getBody().querySelectorAll(jsareaSelector + ' script')).toHaveLength(1);
        expect(editor.getBody().querySelectorAll(jsareaSelector + ' script')[0].src).toBe(widget2.requires.trim());
    });

    it('addRequires adds multiple scripts for multiple matching widgets', () => {
        const editor = createEditor('<div class="w1"></div><div data-prop="w3"></div>');
        const added = addRequires(editor, undefined);
        expect(added).toBe(2);

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect(scripts).toHaveLength(2);
        expect([...scripts].map(s => s.src)).toEqual(expect.arrayContaining([widget1.requires, widget3.requires]));
    });

    it('addRequires with unmatched content removes jsarea if it exists', () => {
        const editor = createEditor('<p>unrelated</p><div class="' + JSAREACLASSNAME + '"><script src="something.js"></script></div>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeFalsy();
    });

    it('cleanUnusedRequires removes unused scripts but retains used ones', () => {
        const html = `
        <div class="w1"></div>
        <div class="${JSAREACLASSNAME}">
            <script src="${widget1.requires}"></script>
            <script src="${widget2.requires}"></script>
        </div>`;
        const editor = createEditor(html);

        const removed = cleanUnusedRequires(editor);
        expect(removed).toBe(1); // one script removed

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect(scripts).toHaveLength(1);
        expect(scripts[0].src).toBe(widget1.requires);
    });

    it('addRequires does not add duplicate scripts if already present', () => {
        const html = `
        <div class="w1"></div>
        <div class="${JSAREACLASSNAME}">
            <script src="${widget1.requires}"></script>
        </div>`;
        const editor = createEditor(html);

        const added = addRequires(editor, undefined);
        expect(added).toBe(0); // no new script added

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect(scripts).toHaveLength(1);
        expect(scripts[0].src).toBe(widget1.requires);
    });

    it('addRequires detects widgets with array and string selectors correctly', () => {
        const editor = createEditor('<div class="w1"></div>\n<p role="img"><img src="/img.png"/></p>');
        const added = addRequires(editor, undefined);
        expect(added).toBe(2);

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect([...scripts].map(s => s.src)).toEqual(expect.arrayContaining([widget1.requires.trim(), widget2.requires.trim()]));
    });

    it('addRequires adds multiple scripts for multiple matching widgets', () => {
        const editor = createEditor('<div class="w1"></div><div data-prop="w3"></div>');
        const added = addRequires(editor, undefined);
        expect(added).toBe(2);

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect(scripts).toHaveLength(2);
        expect([...scripts].map(s => s.src)).toEqual(expect.arrayContaining([widget1.requires, widget3.requires]));
    });

    it('addRequires with unmatched content removes jsarea if it exists', () => {
        const editor = createEditor('<p>unrelated</p><div class="' + JSAREACLASSNAME + '"><script src="something.js"></script></div>');
        expect(addRequires(editor, undefined)).toBe(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeFalsy();
    });

    it('cleanUnusedRequires removes unused scripts but retains used ones', () => {
        const html = `
        <div class="w1"></div>
        <div class="${JSAREACLASSNAME}">
            <script src="${widget1.requires}"></script>
            <script src="${widget2.requires}"></script>
        </div>`;
        const editor = createEditor(html);

        const removed = cleanUnusedRequires(editor);
        expect(removed).toBe(1);

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect(scripts).toHaveLength(1);
        expect(scripts[0].src).toBe(widget1.requires);
    });

    it('addRequires does not add duplicate scripts if already present', () => {
        const html = `
        <div class="w1"></div>
        <div class="${JSAREACLASSNAME}">
            <script src="${widget1.requires}"></script>
        </div>`;
        const editor = createEditor(html);

        const added = addRequires(editor, undefined);
        expect(added).toBe(0);

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect(scripts).toHaveLength(1);
    });

    it('addRequires detects widgets with array and string selectors correctly', () => {
        const editor = createEditor('<div class="w1"></div><div role="img"><img src="/img.png"/></div>');
        const added = addRequires(editor, undefined);
        expect(added).toBe(2);

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect([...scripts].map(s => s.src)).toEqual(expect.arrayContaining([widget1.requires.trim(), widget2.requires.trim()]));
    });

    it('addRequires updates existing jsarea to include missing required scripts', () => {
        const html = `
        <div class="w1"></div><div data-prop="w3"></div>
        <div class="${JSAREACLASSNAME}">
            <script src="${widget1.requires}"></script>
        </div>`;
        const editor = createEditor(html);

        const added = addRequires(editor, undefined);
        expect(added).toBe(1);

        const scripts = editor.getBody().querySelectorAll(jsareaSelector + ' script');
        expect(scripts).toHaveLength(2);
        expect([...scripts].map(s => s.src)).toEqual(expect.arrayContaining([widget1.requires, widget3.requires]));
    });

    it('addRequires ignores widgets without a "selectors" field', () => {
        const badWidget = { key: 'w4', requires: 'https://p.es/q.js' };
        const editor = createEditor('<div class="w1"></div><div class="w4"></div>');

        editor.options.get = jest.fn().mockReturnValue([widget1, badWidget]);

        const added = addRequires(editor, undefined);
        expect(added).toBe(1);
    });

    it('cleanUnusedRequires removes entire jsarea when no scripts are needed', () => {
        const html = `
        <div><p>no matching widgets</p></div>
        <div class="${JSAREACLASSNAME}">
            <script src="${widget2.requires}"></script>
        </div>`;
        const editor = createEditor(html);

        const removed = cleanUnusedRequires(editor);
        expect(removed).toBeGreaterThan(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeNull();
    });

    it('cleanUnusedRequires skips malformed script tags safely', () => {
        const html = `
        <div class="' + JSAREACLASSNAME + '">
            <script></script>
            <script src="bad-url"></script>
        </div>`;
        const editor = createEditor(html);

        expect(() => cleanUnusedRequires(editor)).not.toThrow();
        expect(editor.getBody().querySelector(jsareaSelector)).toBeFalsy();
    });

    it('addRequires does not add script for non-matching widget selector', () => {
        const editor = createEditor('<div class="unrelated"></div>');
        const added = addRequires(editor, undefined);
        expect(added).toBe(0);
        expect(editor.getBody().querySelector(jsareaSelector)).toBeNull();
    });


});
