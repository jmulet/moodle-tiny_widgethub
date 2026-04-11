/**
 *
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
const U = require("../src/util");

/**
 * @param {number} delay 
 * @returns {Promise<void>}
 */
const wait = function (delay) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), delay);
    });
}

describe('utils module tests', () => {
    /** @type {any} */
    let consoleSpy;

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('genID starts with alpha-numeric', () => {
        const g = U.genID();
        expect(g.length).toBeGreaterThan(8);
        expect(RegExp(/^[a-zA-Z]*./).exec(g)).not.toBe(null);
        for (let i = 0; i < 100; i++) {
            // It is random
            expect(g == U.genID()).toBeFalsy();
        }
    });

    test('it productes a hashCode of string', () => {
        expect(typeof U.hashCode('')).toBe('number');
        expect(typeof U.hashCode('a word')).toBe('number');
        // Non random
        expect(U.hashCode('')).toBe(U.hashCode(''));
        expect(U.hashCode('a word')).toBe(U.hashCode('a word'));
        // Different
        expect(U.hashCode('a word')).not.toBe(U.hashCode('a word.'));
    });

    test('joins two paths in a single one', () => {
        let res;
        res = U.pathJoin("a/b", "c");
        expect(res).toBe("a/b/c");
        res = U.pathJoin("a/b", "/c");
        expect(res).toBe("a/b/c");
        res = U.pathJoin("a/b/", "/c");
        expect(res).toBe("a/b/c");
        res = U.pathJoin("a/b/", "c");
        expect(res).toBe("a/b/c");
        res = U.pathJoin("a/b/", "");
        expect(res).toBe("a/b/");
        res = U.pathJoin("", "c");
        expect(res).toBe("/c");
        res = U.pathJoin("a/b");
        expect(res).toBe("a/b/");
        res = U.pathJoin("", "c");
        expect(res).toBe("/c");
    });

    test('add a baseurl to an url', () => {
        let res;
        res = U.addBaseToUrl("https://piwold.es/iedib", "widgets/sd");
        expect(res).toBe("https://piwold.es/iedib/widgets/sd");
        res = U.addBaseToUrl("https://piwold.es/iedib/", "/widgets/sd");
        expect(res).toBe("https://piwold.es/iedib/widgets/sd");
        res = U.addBaseToUrl("https://piwold.es/iedib/", "https://widgets/sd");
        expect(res).toBe("https://widgets/sd");
        res = U.addBaseToUrl("https://piwold.es/iedib/");
        expect(res).toBe("https://piwold.es/iedib/");
        res = U.addBaseToUrl("", "widgets/sd");
        expect(res).toBe("/widgets/sd");
    });

    test('findVariableByName', () => {
        /** @type {import("../src/options").Param[]} */
        const listVars = [
            {
                name: 'pos',
                title: 'pos param',
                type: 'textfield',
                value: ''
            },
            {
                name: 'cap',
                title: 'cap param',
                type: 'textfield',
                value: ''
            },
            {
                name: 'sigma',
                title: 'sigma param',
                type: 'textfield',
                value: ''
            },
            {
                name: '$ID',
                title: '$ID param',
                type: 'textfield',
                hidden: true,
                value: ''
            }
        ]
        expect(U.findVariableByName('cap', listVars)).toBe(listVars[1])
        expect(U.findVariableByName('pos', listVars)).toBe(listVars[0])
        expect(U.findVariableByName('sigma', listVars)).toBe(listVars[2])
        expect(U.findVariableByName('$ID', listVars)).toBe(listVars[3])
        expect(U.findVariableByName('ca2scf', listVars)).toBe(null)
    });

    test('searchComp', () => {
        expect(U.searchComp('Amics de la casa', 'de la')).toBe(true);
        expect(U.searchComp('Benvinguts aquí', 'aquí ')).toBe(true);
        expect(U.searchComp('Benvinguts aquí', 'AQUí')).toBe(true);
        expect(U.searchComp('Benvinguts aquí', 'AQUÍ ')).toBe(true);
        expect(U.searchComp('Benvinguts aquí', 'AQUÍ no')).toBe(false);
    });

    test.each([
        ["trim | toUpperCase", " Hola   ", "HOLA"],
        ["trim | toUpperCase", "KHola112_s", "KHOLA112_S"],
        ["trim| tdsfsdfoUpperCase", " Hola   ", "Hola"],
        ["toLowerCase", " HoLA", " hola"],
        ["ytId", "https://www.youtube.com/watch?v=-nC-Gq-X_84&list=PL3AWnn9QRaOaCYRBo52pDIP0du21Jf-T1", "-nC-Gq-X_84"],
        ["vimeoId", "https://vimeo.com/channels/staffpicks/1003519988", "1003519988"],
        ["serveGDrive", "https://drive.google.com/file/d/1DDUzcFrOlzWb3CBdFPJ1NCNXClvPbm5B/preview", "https://docs.google.com/uc?export=open&id=1DDUzcFrOlzWb3CBdFPJ1NCNXClvPbm5B"],
        ["removeHTML", "<span>Hi <b>Moodle</b>!</span>", "Hi Moodle!"],
        ["escapeQuotes", "a=\"hello\"", "a='hello'"],
        ["encodeHTML", "a > & 3", encodeURIComponent("a > & 3")]
    ])("Transformer pipe %s applied to %s gives %s", (pipe, input, output) => {
        const res = U.stream(pipe).reduce(input);
        expect(res).toMatch(output);
    });

    test("convertInt", () => {
        expect(U.convertInt('', -1)).toBe(-1)
        expect(U.convertInt('1', 0)).toBe(1)
        expect(U.convertInt(1, 0)).toBe(1)
        expect(U.convertInt(1.2, 0)).toBe(1)
        expect(U.convertInt('7.2', 0)).toBe(7)
        expect(U.convertInt('+7.2', 0)).toBe(7)
        expect(U.convertInt('  + 7.2 ', 99)).toBe(99)
        expect(U.convertInt('  -5.2 ', 99)).toBe(-5)
        expect(U.convertInt('-7234', 0)).toBe(-7234)
        expect(U.convertInt('alp342', 33)).toBe(33)
        expect(U.convertInt('1x1', 33)).toBe(33)
        expect(U.convertInt('1+1', 33)).toBe(33)
    });

    test.each([
        [null, ''],
        [undefined, ''],
        ['', ''],
        ['a', 'A'],
        ['A', 'A'],
        ["moodle", "Moodle"],
        ["  moodle", "  moodle"]
    ])('Capitalize word %s gives %s', (w, cw) => {
        expect(U.capitalize(w)).toBe(cw);
    })

    test('Convert to hex color no alpha set', () => {
        // No color passed
        expect(U.toHexAlphaColor("")).toStrictEqual(["#000000", 1]);
        // Already in hex
        expect(U.toHexAlphaColor(" #ffaa01")).toStrictEqual(["#ffaa01", 1]);
        // convert rgb to hex
        expect(U.toHexAlphaColor("rgb(255, 255, 255)")).toStrictEqual(["#ffffff", 1]);
        expect(U.toHexAlphaColor("rgb(255, 0, 255)")).toStrictEqual(["#ff00ff", 1]);
    });


    test('Convert to hex color with alpha set', () => {
        // No color passed
        expect(U.toHexAlphaColor("")).toStrictEqual(["#000000", 1]);
        // Already in hex
        expect(U.toHexAlphaColor(" #ffaa0123")).toStrictEqual(["#ffaa01", 35 / 255]);
        // convert rgb to hex
        expect(U.toHexAlphaColor("rgb(255, 255, 255, 15)")).toStrictEqual(["#ffffff", 0.15]);
        expect(U.toHexAlphaColor("rgb(255, 0, 255, 0.25)")).toStrictEqual(["#ff00ff", 0.25]);
    });

    test('Convert to rgb color', () => {
        expect(U.toRgba(null, 1)).toBe("rgb(0,0,0)");
        expect(U.toRgba(undefined, 1)).toBe("rgb(0,0,0)");
        expect(U.toRgba("#ff00ff", 1)).toBe("rgb(255,0,255)");
        expect(U.toRgba("#ff00ff", 0)).toBe("rgba(255,0,255,0)");
        expect(U.toRgba("#ff00ff", 0.25)).toBe("rgba(255,0,255,0.25)");
        expect(U.toRgba("#ff00ff", 25)).toBe("rgba(255,0,255,0.25)");
        expect(U.toRgba("#ff00ff", 0.2537256)).toBe("rgba(255,0,255,0.25)");
        expect(U.toRgba("#ff00ff", 0.2587256)).toBe("rgba(255,0,255,0.26)");
    });

    test('debounce', async () => {
        const cb = jest.fn();
        const debounced1 = U.debounce(cb, 800);
        debounced1();
        await wait(100);
        debounced1();
        await wait(1000);
        expect(cb).toHaveBeenCalledTimes(1);

        // Cancel
        cb.mockReset();
        const debounced2 = U.debounce(cb, 800);
        debounced2();
        await wait(200);
        debounced2.clear();
        await wait(1000);
        expect(cb).toHaveBeenCalledTimes(0);
    });

    test('ToggleClass', () => {
        let elem = document.createElement('SPAN');
        elem.classList.add('cl1', 'cl2');
        U.toggleClass(elem, 'cl3', 'cl4');
        expect([...elem.classList].sort()).toStrictEqual(['cl1', 'cl2', 'cl3', 'cl4']);
        U.toggleClass(elem, 'cl1', 'cl3');
        expect([...elem.classList].sort()).toStrictEqual(['cl2', 'cl4']);
    });

    test.each([
        // Basic comparisons
        ["1.2.3", "1.2.3", true, false],
        ["1.2.3", "= 1.2.3", true, false],
        ["1.2.3", "> 1.2.2", true, false],
        ["1.2.3", ">= 1.2.3", true, false],
        ["1.2.3", "< 1.2.4", true, false],
        ["1.2.3", "<= 1.2.3", true, false],
        ["1.2.3", "< 1.2.3", false, false],
        ["1.2.3", "> 1.2.3", false, false],
        ["1.2.3", "= 1.2.2", false, false],

        // Missing minor or patch
        ["1", "= 1.0.0", true, false],
        ["1", ">= 0.9.9", true, false],
        ["1.2", "= 1.2.0", true, false],
        ["1.2", "< 1.2.1", true, false],
        ["1.2.3", "> 1.1", true, false],
        ["2", "<= 2.0.0", true, false],

        // Spaces around numbers/operators
        [" 1.2.3 ", " = 1.2.3 ", true, false],
        ["1.2.3", ">= 1.2", true, false],
        ["1.2.3", " < 2.0.0 ", true, false],
        [" 1.2.3", " >1.2.4", false, false],
        ["1.2.3", "= 1.2.3 ", true, false],
        ["1 . 2 . 3", "= 1.2.3", true, false],

        // Edge cases
        ["0.0.0", "= 0", true, false],
        ["0.0.1", "> 0", true, false],
        ["0.1", "< 0.2.0", true, false],
        ["1.0.0", "< 2", true, false],
        ["2.0.0", "> 1.9.9", true, false],

        // Invalid / empty / null / undefined
        ["1.2.3", ">> 1.2.3", true, true],
        ["1.2.3", "=> 1.2.3", true, true],
        ["1.2.3", "1..2", true, true],
        ["1.2.3", ">= abc", true, true],
        ["1.2.3", "", true, false],
        ["1.2.3", null, true, false],
        ["1.2.3", undefined, true, false],
    ])(
        'compareVersion(%s, %s)',
        (current, condition, expected, shouldThrow) => {
            expect(U.compareVersion(current, condition)).toBe(expected);
            if (shouldThrow) {
                expect(consoleSpy).toHaveBeenCalled();
            }
        }
    );


    test("removeRndFromCtx should remove parameters associated to $RND", () => {
        /** @type {*} */
        const parameters = [
            { name: 'q', value: '' },
            { name: 'id', value: '$RND' },
            { name: 'effect', value: 'none' },
        ];
        const ctx = {
            q: 'foo value',
            id: 'd24523fvvv_34',
            effect: 'fade'
        }
        expect(U.removeRndFromCtx(ctx, parameters)).toEqual({
            q: 'foo value',
            effect: 'fade'
        }
        );
    });

    test("removeRndFromCtx should not remove any parameters", () => {
        /** @type {*} */
        const parameters = [
            { name: 'q', value: '' },
            { name: 'id', value: 'RND' },
            { name: 'effect', value: 'none' },
        ];
        const ctx = {
            q: 'foo value',
            id: 'd24523fvvv_34',
            effect: 'fade'
        }
        expect(U.removeRndFromCtx(ctx, parameters)).toEqual(ctx);
    });

    test.each([
        [`styleRegex("background-image:url\\(['\\"]?([^'\\")]*)['\\"]?\\)")`, { name: 'styleRegex', args: ["background-image:url\\(['\"]?([^'\")]*)['\"]?\\)"] }],
        ["f('x')", { name: 'f', args: ['x'] }],
        ["classRegex('alert-(.*)')", { name: 'classRegex', args: ['alert-(.*)'] }],
        ["attr('src', 'img')", { name: 'attr', args: ['src', 'img'] }],
        ["styleRegex('max-width:(.*)px', null, 'number')", { name: 'styleRegex', args: ['max-width:(.*)px', null, 'number'] }],
        ["attrBS('original-title')", { name: 'attrBS', args: ['original-title'] }],
        // Type support: Numbers, Booleans, Null, Undefined
        ["calculate(100, -5.5, true, false, null, undefined)", {
            name: 'calculate',
            args: [100, -5.5, true, false, null, undefined]
        }],

        // Regex with modifiers
        ["match(/^[a-z]+$/gi)", {
            name: 'match',
            args: [/^[a-z]+$/gi]
        }],

        // Escaped quotes inside strings
        ["log('It\\'s a trap!', \"He said \\\"Hello\\\"\")", {
            name: 'log',
            args: ["It's a trap!", 'He said "Hello"']
        }],

        // Whitespace tolerance (around commas, names, and parens)
        ["  spaceFn  (  'arg1'  ,  'arg2'  )  ", {
            name: 'spaceFn',
            args: ['arg1', 'arg2']
        }],

        // Empty arguments and empty functions
        ["init()", { name: 'init', args: [] }],
        ["trailingComma('data', )", { name: 'trailingComma', args: ['data', undefined] }],

        // Identifiers with numbers, underscores, and $
        ["$_update_2(1)", { name: '$_update_2', args: [1] }],

        // Complex strings containing delimiters
        ["csv('one,two', 'three)four')", {
            name: 'csv',
            args: ['one,two', 'three)four']
        }],
        // Basic Regex
        ["search(/abc/)", { name: 'search', args: [/abc/] }],

        // Regex with multiple modifiers
        ["filter(/\\d+/gim)", { name: 'filter', args: [/\d+/gim] }],

        // Regex containing commas and parentheses (should not break parsing)
        ["match(/a(b,c)d/g)", { name: 'match', args: [/a(b,c)d/g] }],

        // Regex mixed with other types
        ["validate(/^[0-9]+$/, true, 'Error')", {
            name: 'validate',
            args: [/^[0-9]+$/, true, 'Error']
        }],

        // Regex with advanced modifiers (u, s, y)
        ["unicodeCheck(/\\p{L}/u, /foo/s)", {
            name: 'unicodeCheck',
            args: [/\p{L}/u, /foo/s]
        }],

        // Empty Regex pattern
        ["empty(//)", { name: 'empty', args: [/(?:)/] }]
    ])(
        "fnCallParser should parse a function call %s", (fnCallStr, parsedFnCall) => {
            expect(typeof fnCallStr).toBe('string');
            expect(typeof parsedFnCall).toBe('object');
            expect(U.fnCallParser(fnCallStr)).toStrictEqual(parsedFnCall);

        });

    test.each([
        // --- Name / Identifier Errors ---
        ["1fn()", "Name cannot start with number"],
        ["fn-name()", "Illegal character in name: -"],
        ["(1, 2)", "Expected name"], // Missing name entirely

        // --- Structural Errors ---
        ["fn(1, 2", "Incomplete call"], // Missing closing parenthesis
        ["fn 1, 2)", "Expected ("], // Missing opening parenthesis
        ["fn(1, 2) extra", "Trailing data"], // Data after the function call ends
        ["fn('arg' 'another')", "Expected delimiter"], // Missing comma between strings
        ["fn('arg' 123)", "Expected delimiter"], // Missing comma between string and number

        // --- Argument / Type Errors ---
        ["fn(unknownVariable)", "Invalid argument type: unknownVariable"],
        ["fn(nullish)", "Invalid argument type: nullish"],
        ["fn(1.2.3)", "Invalid argument type: 1.2.3"],

        // --- String / Regex Errors ---
        ["fn('unclosed string)", "Incomplete call"],
        ["fn(/unclosed regex)", "Incomplete call"],
        ["fn(/malformed(regex/)", "Invalid regular expression: /malformed(regex/: Unterminated group"], // If the second slash is missing
    ])(
        "should throw error for invalid input: %s", (invalidExpr, expectedError) => {
            expect(() => U.fnCallParser(invalidExpr)).toThrow(expectedError);
        }
    );

});