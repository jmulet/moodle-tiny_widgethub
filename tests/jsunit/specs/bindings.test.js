/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const { bindingsFactoryAPI, performCasting } = require("../src/bindings");
const U = require("../src/util");
/** @ts-ignore */
const jQuery = require("jquery").default;

/**
 * @param {string} bindDef 
 * @param {HTMLElement} elem 
 * @returns 
 */
function createBinding(bindDef, elem) {
    const { name, args } = U.fnCallParser(bindDef);
    const bindingFn = bindingsFactoryAPI[name];
    return bindingFn.apply(null, [elem, ...args]);
}

describe('bindings module tests', () => {
    /** @type {any} */
    let consoleSpy;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });


    test('performCasting', () => {
        expect(performCasting('true', 'boolean')).toStrictEqual(true);
        expect(performCasting(true, 'boolean')).toStrictEqual(true);
        expect(performCasting(1, 'boolean')).toStrictEqual(true);
        expect(performCasting('false', 'boolean')).toStrictEqual(false);
        expect(performCasting(false, 'boolean')).toStrictEqual(false);
        expect(performCasting(0, 'boolean')).toStrictEqual(false);

        expect(performCasting('wrong number', 'number')).toStrictEqual(0);
        expect(performCasting('12', 'number')).toStrictEqual(12);
        expect(performCasting('-12', 'number')).toStrictEqual(-12);
        expect(performCasting('7.5', 'number')).toStrictEqual(7.5);

        expect(performCasting('a string', 'string')).toStrictEqual('a string');
        expect(performCasting(12, 'string')).toStrictEqual('12');
        expect(performCasting(true, 'string')).toStrictEqual('true');
        expect(performCasting(false, 'string')).toStrictEqual('false');
        expect(performCasting({ a: 1 }, 'string')).toStrictEqual('{"a":1}');
        expect(performCasting({ a: 1 }, 'unktype')).toStrictEqual({ "a": 1 });
    });



    test.each([
        ["hasClass('editable')", `<span class="a editable"></span>`, true],
        ["hasClass('editable')", `<span class="b locked c"></span>`, false],

        ["notHasClass('editable')", `<span class="editable"></span>`, false],
        ["notHasClass('editable')", `<span class="locked"></span>`, true],

        ["classRegex('locked-(.*)')", `<span class="locked"></span>`, ''],
        ["classRegex('locked-(.*)')", `<span class="locked-"></span>`, ''],
        ["classRegex('locked-(.*)')", `<span class="locked-abc"></span>`, 'abc'],
        ["classRegex('locked-([0-9]*)-some(.*)')", `<span class="etc"></span>`, ''],
        ["classRegex('locked-([0-9]*)-some(.*)')", `<span class="locked--some etc"></span>`, ''],
        ["classRegex('locked-([0-9]*)-some(.*)')", `<span class="locked-123-somes etc"></span>`, '123'],

        ["hasAttr('data-locked')", `<span data-locked></span>`, true],
        ["hasAttr('data-locked')", `<span data-locked="false"></span>`, true],
        ["hasAttr('data-locked')", `<span data-open="false"></span>`, false],
        ["hasAttr('data-locked=silent')", `<span data-locked="silent"></span>`, true],

        ["notHasAttr('data-locked')", `<span data-locked></span>`, false],
        ["notHasAttr('data-locked')", `<span data-locked="false"></span>`, false],
        ["notHasAttr('data-locked')", `<span data-open="false"></span>`, true],

        ["attr('data-locked')", `<span data-locked="false"></span>`, "false"],
        ["attr('data-locked', null, 'number')", `<span data-locked="4"></span>`, 4],
        ["attr('data-locked')", `<span></span>`, null],

        ["attrRegex('role=channel(.*)')", `<span role="channel1234"></span>`, '1234'],
        ["attrRegex('role=channel(.*)', null, 'number')", `<span role="channel1234"></span>`, 1234],
        ["attrRegex('role=channel(.*)')", `<span role="channel"></span>`, ''],
        ["attrRegex('role=locked-([0-9]*)-abc')", `<span role="locked--abc"></span>`, ''],
        ["attrRegex('role=locked-([0-9]*)-abc')", `<span role="locked-123-abc"></span>`, '123'],

        ["hasStyle('width')", `<span style="width: 100px;"></span>`, true],
        ["hasStyle('height')", `<span style="width: 100px;"></span>`, false],
        ["hasStyle('color:red')", `<span style="color: red;"></span>`, true],

        ["notHasStyle('width')", `<span style="width: 100px;"></span>`, false],
        ["notHasStyle('height')", `<span style="width: 100px;"></span>`, true],

        ["styleRegex('width: (.*)px')", `<span style="width: 100px;"></span>`, "100"],
        ["styleRegex('width: (.*)px', null, 'number')", `<span style="width: 100px;"></span>`, 100],
        [`styleRegex("background-image:url\\(['\\"]?([^'\\")]*)['\\"]?\\)")`,
            `<span class="iedib-background-img" style="background-image:url(http://localhost:4545/pluginfile.php/19/mod_page/content/5/icon.png); padding: 10px; min-height: 40px; background-repeat: no-repeat; background-size: cover; background-position: 50% 50%;">
            Quina probabilitat tinc de guanyar els jocs d'atzar?</span>`, 'http://localhost:4545/pluginfile.php/19/mod_page/content/5/icon.png'],
        ["html()", `<span><b>Content</b></span>`, "<b>Content</b>"],
        ["text()", `<span>Content</span>`, "Content"],
        ["attrBS('target')", `<span data-target="modal"></span>`, "modal"],
        ["attrBS('target', null, null, 5)", `<span data-bs-target="modal"></span>`, "modal"],
        ["hasAttrBS('target=modal')", `<span data-target="modal"></span>`, true],
        ["hasAttrBS('target=modal', null, null, 5)", `<span data-bs-target="modal"></span>`, true]
    ])('Create GET binding %s on %s returns %s', (bindDef, elemDef, result) => {
        let elem = U.htmlToElement(document, elemDef)
        // Binding on the same element
        let binding = createBinding(bindDef, elem);
        expect(binding).not.toBeNull();
        expect(binding?.getValue()).toBe(result);

        // Binding on a child
        elem = U.htmlToElement(document, `<div class="container">${elemDef}</div>`);
        if (bindDef.indexOf("()") > 0) {
            bindDef = bindDef.replace("()", "('span')");
        } else if (bindDef.indexOf("null") > 0) {
            bindDef = bindDef.replace("null", "'span'");
        } else {
            bindDef = bindDef.substring(0, bindDef.length - 1) + ", 'span')";
        }
        binding = createBinding(bindDef, elem);
        expect(binding).not.toBeNull();
        expect(binding?.getValue()).toBe(result);
    });

    test('Testing class regex', () => {
        let [bindDef, elemDef, result] = ["classRegex('alert-(.*)')", `<div class="m-2 alert alert-secondary fade show" role="alert"><div class="alert-content"><p>Lorem ipsum.</p></div></div>`, 'secondary'];
        let elem = U.htmlToElement(document, elemDef);
        expect(elem).toBeTruthy();
        // Binding on the same element
        let binding = createBinding(bindDef, elem);
        expect(binding).not.toBeNull();
        expect(binding?.getValue()).toBe(result);
    });

    /**
     * 
     * @param {string | undefined} html 
     * @returns {string}
     */
    function normalizeStyle(html) {
        return html?.replace(/\s*:\s*/g, ':')
            .replace(/\s*;\s*/g, ';')
            .replace(/&quot;/g, '"')
            .replace(/url\((['"]?)(.*?)\1\)/g, 'url($2)') || '';
    }

    test.each([
        ["hasClass('editable')", `<span class="a editable"></span>`, true, `<span class="a editable"></span>`],
        ["hasClass('editable')", `<span class="a editable"></span>`, false, `<span class="a"></span>`],
        ["hasClass('editable')", `<span class="b locked c"></span>`, false, `<span class="b locked c"></span>`],
        ["hasClass('editable')", `<span class="b locked c"></span>`, true, `<span class="b locked c editable"></span>`],

        ["notHasClass('editable')", `<span class="a editable"></span>`, true, `<span class="a"></span>`],
        ["notHasClass('editable')", `<span class="a editable"></span>`, false, `<span class="a editable"></span>`],
        ["notHasClass('editable')", `<span class="b locked c"></span>`, false, `<span class="b locked c editable"></span>`],
        ["notHasClass('editable')", `<span class="b locked c"></span>`, true, `<span class="b locked c"></span>`],

        // ["classRegex('locked-(.*)')", `<span class="locked"></span>`, 'mood', `<span class="locked locked-mood"></span>`],
        ["classRegex('locked-(.*)')", `<span class="locked-"></span>`, 'mood', `<span class="locked-mood"></span>`],
        ["classRegex('locked-(.*)')", `<span class="locked-abc"></span>`, 'efg', `<span class="locked-efg"></span>`],
        ["classRegex('locked-([0-9]*)-some(.*)')", `<span class="etc locked--some"></span>`, '789', `<span class="etc locked-789-some"></span>`],
        ["classRegex('locked-([0-9]*)-some(.*)')", `<span class="etc locked-123-somes"></span>`, '345', '<span class="etc locked-345-somes"></span>'],
        ["classRegex('locked-([0-9]*)-some(.*)')", `<span class="etc"></span>`, '790', `<span class="etc locked-790-some"></span>`],

        ["hasAttr('data-locked')", `<span data-locked></span>`, true, `<span data-locked=""></span>`],
        ["hasAttr('data-locked')", `<span data-locked></span>`, false, `<span></span>`],
        ["hasAttr('data-locked')", `<span data-open="false"></span>`, true, `<span data-open="false" data-locked=""></span>`],
        ["hasAttr('data-locked=silent')", `<span data-locked="silent"></span>`, true, `<span data-locked="silent"></span>`],
        ["hasAttr('data-locked=silent')", `<span></span>`, true, `<span data-locked="silent"></span>`],

        ["hasAttr('href=home')", `<span></span>`, true, `<span href="home" data-mce-href="home"></span>`],
        ["hasAttr('href=home')", `<span href="home" data-mce-href="home"></span>`, false, `<span></span>`],

        ["notHasAttr('data-locked')", `<span data-locked></span>`, true, `<span></span>`],
        ["notHasAttr('data-locked')", `<span data-locked></span>`, false, `<span data-locked=""></span>`],
        ["notHasAttr('data-locked')", `<span data-open="false"></span>`, true, `<span data-open="false"></span>`],
        ["notHasAttr('data-locked=silent')", `<span data-locked="silent"></span>`, true, `<span></span>`],
        ["notHasAttr('data-locked=silent')", `<span></span>`, false, `<span data-locked="silent"></span>`],

        ["attr('data-locked')", `<span data-locked="false"></span>`, "enabled", `<span data-locked="enabled"></span>`],
        ["attr('data-locked', null, 'number')", `<span data-locked="4"></span>`, 87, `<span data-locked="87"></span>`],
        ["attr('data-locked')", `<span></span>`, "test", `<span data-locked="test"></span>`],

        ["attrRegex('role=channel(.*)')", `<span role="channel1234"></span>`, '5678', `<span role="channel5678"></span>`],
        ["attrRegex('role=channel(.*)', null, 'number')", `<span role="channel1234"></span>`, 'testing', `<span role="channeltesting"></span>`],

        ["hasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, true, `<span style="height: 10px; width: 100px;" data-mce-style="height: 10px; width: 100px;"></span>`],
        ["hasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, false, `<span style="height: 10px;" data-mce-style="height: 10px;"></span>`],
        ["hasStyle('height:50px')", `<span style="width: 100px;"></span>`, true, `<span style="width: 100px; height: 50px;" data-mce-style="width: 100px; height: 50px;"></span>`],

        ["notHasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, true, `<span style="height: 10px;" data-mce-style="height: 10px;"></span>`],
        ["notHasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, false, `<span style="height: 10px; width: 100px;" data-mce-style="height: 10px; width: 100px;"></span>`],
        ["notHasStyle('height:50px')", `<span style="width: 100px;"></span>`, true, `<span style="width: 100px;" data-mce-style="width: 100px;"></span>`],

        ["styleRegex('width: (.*)px')", `<span style="width: 100px;"></span>`, "700", `<span style="width: 700px;" data-mce-style="width: 700px;"></span>`],
        ["styleRegex('width: (.*)px', null, 'number')", `<span style="width: 100px;"></span>`, 700, `<span style="width: 700px;" data-mce-style="width: 700px;"></span>`],

        [`styleRegex("background-image:url\\(['\\"]?([^'\\")]*)['\\"]?\\)")`,
            `<span class="iedib-background-img" style="background-image:url(https://site.net/example.png); padding: 10px;">
            Lorem ipsum.</span>`,
            'https://newsite.com/example32.png',
            `<span class="iedib-background-img" style="background-image: url(&quot;https://newsite.com/example32.png&quot;); padding: 10px;" data-mce-style="background-image: url(&quot;https://newsite.com/example32.png&quot;); padding: 10px;">
            Lorem ipsum.</span>`],

        ["html()", `<span>Old <i>...</i></span>`, "New <b>bold</b>", "<span>New <b>bold</b></span>"],
        ["text()", `<span>Old <b>old</b></span>`, "New content", "<span>New content</span>"],
        ["attrBS('target')", `<span></span>`, "modal", `<span data-bs-target="modal" data-target="modal"></span>`],
        ["attrBS('target', null, null, 5)", `<span></span>`, "modal", `<span data-bs-target="modal"></span>`],
        ["hasAttrBS('target=modal')", `<span></span>`, true, `<span data-bs-target="modal" data-target="modal"></span>`],
        ["hasAttrBS('target=modal', null, null, 5)", `<span></span>`, true, `<span data-bs-target="modal"></span>`]


    ])('Create SET binding %s on %s. If sets value %s yields %s', (bindDef, elemDef, value, result) => {
        let elem = U.htmlToElement(document, elemDef)
        // Binding on the same element
        let binding = createBinding(bindDef, elem);
        expect(binding).not.toBeNull();
        binding?.setValue(value)
        expect(normalizeStyle(elem.outerHTML)).toBe(normalizeStyle(result));

        // Binding on a child
        const e = U.htmlToElement(document, `<div class="container">${elemDef}</div>`);
        let childBindDef = bindDef; // Use a new variable for child binding definition
        if (childBindDef.indexOf("()") > 0) {
            childBindDef = childBindDef.replace("()", "('span')");
        } else if (childBindDef.indexOf("null") > 0) {
            childBindDef = childBindDef.replace("null", "'span'");
        } else {
            // This handles cases like hasClass('editable') -> hasClass('editable', 'span')
            // or attr('data-locked') -> attr('data-locked', 'span')
            // It assumes the last argument is the selector, or adds it if not present.
            // This might need more robust parsing for complex bindDefs.
            const lastParenIndex = childBindDef.lastIndexOf(')');
            if (lastParenIndex > -1) {
                childBindDef = childBindDef.substring(0, lastParenIndex) + ", 'span')";
            } else {
                // Fallback for unexpected formats, though current bindDefs should have ')'
                childBindDef += "('span')";
            }
        }
        binding = createBinding(childBindDef, e);
        expect(binding).not.toBeNull();
        binding?.setValue(value)
        expect(normalizeStyle(e.querySelector("span")?.outerHTML)).toBe(normalizeStyle(result));

    });
});