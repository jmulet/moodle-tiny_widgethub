/**
 * @jest-environment jsdom
 */
const U = require("../src/util");
const jQuery = require("jquery");

describe('utils module tests', () => {

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

    test('evaluate within a context', () => {
        const scope = { a: 3, b: 5, c: -4 }
        let res = U.evalInContext(scope, "a+b*c");
        expect(res).toBe(-17);
        res = U.evalInContext(scope, "");
        expect(res).toBe(undefined);
        const f = () => U.evalInContext(scope, "7*h");
        expect(f).toThrowError();
        res = U.evalInContext({}, "5*4-8");
        expect(res).toBe(12);
    });

    test('create filter function', () => {
        const filter = U.createFilterFunction(`
            return [text.toUpperCase().substring(2).replace(/\\s/g,''), null];
        `)
        expect(filter).not.toBeNull();
        if (filter != null) {
            const filteredText = filter("hola mundo!");
            if (filteredText != null && !('then' in filteredText)) {
                expect(filteredText[0]).toBe("LAMUNDO!");
                expect(filteredText[1]).toBeNull();
            }
        }
        const filter2 = U.createFilterFunction(`
            return new Promise((resolve, reject)=>{
                resolve([text, 'An error internal occurred!']);
            });
        `)
        expect(filter2).not.toBeNull();
        if (filter2 != null) {
            const filteredText = filter2("hola mundo!");
            if (filteredText != null && ('then' in filteredText)) {
                // @ts-ignore
                filteredText.then((res) => {
                    expect(res[0]).toBe("hola mundo!");
                    expect(res[1]).toBe('An error internal occurred!');
                })
            }
        }

    });

    test('creates a filter function', () => {
        const scriptSrc = `
        text = text.replace(/[ae]/ig, function($0, $1){
            return $0.toUpperCase();
        });
        return text;
        `
        const f = U.createFilterFunction(scriptSrc);
        expect(f).not.toBeNull();
        if (f != null) {
            const res = f("america esa gran desconocida de las aviacion")
            expect(res).toBe("AmEricA EsA grAn dEsconocidA dE lAs AviAcion")
        }
    });

    it("It applies widgetFilter", async() => {
        const editor = {
            notificationManager: {
                open: jest.fn()
            },
            setContent: jest.fn(),
            getContent: jest.fn().mockImplementation(() => "<p>This is the editor's content</p>"),
            dom: {
                window
            }
        };
        const coreStr = {
            get_strings: (/** @type {any[]} **/ lst) => {
                return Promise.resolve(lst.map(e => e.key))
            }
        }
        // Invalid script shows error message
        const applyWidgetFilter = U.applyWidgetFilterFactory(editor, coreStr);
        let res = await applyWidgetFilter("Bad script");
        expect(editor.notificationManager.open).toHaveBeenCalledWith({
            text: "filterres: Invalid filter",
            type: 'danger',
            timeout: 4000
        });
        expect(res).toBe(false);

        editor.notificationManager.open.mockClear();
        // Valid script without applying any changes
        res = await applyWidgetFilter(`
            // This is the filter definition
            return [null, 'no change done'];
        `);
        expect(editor.notificationManager.open).toHaveBeenCalledWith({
            text: "nochanges",
            type: 'info',
            timeout: 4000
        });
        expect(res).toBe(true);
        expect(editor.setContent).not.toHaveBeenCalled();

        editor.notificationManager.open.mockImplementation();
        // Valid script applying changes
        res = await applyWidgetFilter(`
            // This is the filter definition
            var txt2 = text.replace("editor's", "TinyMCE editor's");
            // Replace the entire content
            return [txt2, 'change done'];
        `);
        expect(editor.notificationManager.open).toHaveBeenCalledWith({
            text: "filterres: change done",
            type: 'success',
            timeout: 5000
        });
        expect(res).toBe(true);
        expect(editor.setContent).toHaveBeenCalledWith("<p>This is the TinyMCE editor's content</p>");
    });


    test('performCasting', () => {
        expect(U.performCasting('true', 'boolean')).toStrictEqual(true);
        expect(U.performCasting(true, 'boolean')).toStrictEqual(true);
        expect(U.performCasting(1, 'boolean')).toStrictEqual(true);
        expect(U.performCasting('false', 'boolean')).toStrictEqual(false);
        expect(U.performCasting(false, 'boolean')).toStrictEqual(false);
        expect(U.performCasting(0, 'boolean')).toStrictEqual(false);

        expect(U.performCasting('wrong number', 'number')).toStrictEqual('wrong number');
        expect(U.performCasting('12', 'number')).toStrictEqual(12);
        expect(U.performCasting('-12', 'number')).toStrictEqual(-12);
        expect(U.performCasting('7.5', 'number')).toStrictEqual(7.5);

        expect(U.performCasting('a string', 'string')).toStrictEqual('a string');
        expect(U.performCasting(12, 'string')).toStrictEqual('12');
        expect(U.performCasting(true, 'string')).toStrictEqual('true');
        expect(U.performCasting(false, 'string')).toStrictEqual('false');
        expect(U.performCasting({a: 1}, 'string')).toStrictEqual('{"a":1}');
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
        ["removeHTML", "<span>Hi <b>Moodle</b>!</span>", "Hi Moodle!"]
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

    test('addScript', () => {
        U.addScript('https://piworld.es', 'scriptTest');
        expect(document.querySelector('script[src="https://piworld.es"]')).not.toBe(null);
        U.addScript('https://piworld.es', 'scriptTest');
        expect(document.querySelectorAll('script[src="https://piworld.es"]').length).toBe(1);
    });

    test.each([
        ["hasClass('editable')", `<span class="a editable"></span>`, true],
        ["hasClass('editable')", `<span class="b locked c"></span>`, false],

        ["notHasClass('editable')", `<span class="editable"></span>`, false],
        ["notHasClass('editable')", `<span class="locked"></span>`, true],

        ["classRegex('locked-(.*)')", `<span class="locked"></span>`, ''],
        ["classRegex('locked-(.*)')", `<span class="locked-"></span>`, ''],
        ["classRegex('locked-(.*)')", `<span class="locked-abc"></span>`, 'abc'],

        ["hasAttr('data-locked')", `<span data-locked></span>`, true],
        ["hasAttr('data-locked')", `<span data-locked="false"></span>`, true],
        ["hasAttr('data-locked')", `<span data-open="false"></span>`, false],
        ["hasAttr('data-locked=silent')", `<span data-locked="silent"></span>`, true],

        ["notHasAttr('data-locked')", `<span data-locked></span>`, false],
        ["notHasAttr('data-locked')", `<span data-locked="false"></span>`, false],
        ["notHasAttr('data-locked')", `<span data-open="false"></span>`, true],

        ["attr('data-locked')", `<span data-locked="false"></span>`, "false"],
        ["attr('data-locked', null, 'number')", `<span data-locked="4"></span>`, 4],
        ["attr('data-locked')", `<span></span>`, undefined],

        ["attrRegex('role=channel(.*)')", `<span role="channel1234"></span>`, '1234'],
        ["attrRegex('role=channel(.*)', null, 'number')", `<span role="channel1234"></span>`, 1234],
        ["attrRegex('role=channel(.*)')", `<span role="channel"></span>`, ''],

        ["hasStyle('width')", `<span style="width: 100px;"></span>`, true],
        ["hasStyle('height')", `<span style="width: 100px;"></span>`, false],
        ["hasStyle('color:red')", `<span style="color: red;"></span>`, true],

        ["notHasStyle('width')", `<span style="width: 100px;"></span>`, false],
        ["notHasStyle('height')", `<span style="width: 100px;"></span>`, true],

        ["styleRegex('width: (.*)px')", `<span style="width: 100px;"></span>`, "100"],
        ["styleRegex('width: (.*)px', null, 'number')", `<span style="width: 100px;"></span>`, 100]
    ])('Create binding %s on %s returns %s', (bindDef, elemDef, result) => {
        let $e = jQuery(elemDef)
        // Binding on the same element
        let binding = U.createBinding(bindDef, $e);
        expect(binding).not.toBeNull();
        expect(binding?.getValue()).toBe(result);

        // Binding on a child
        $e = jQuery(`<div class="container">${elemDef}</div>`);
        if (bindDef.indexOf("null") > 0) {
            bindDef = bindDef.replace("null", "'span'");
        } else {
            bindDef = bindDef.substring(0, bindDef.length - 1) + ", 'span')";
        }
        binding = U.createBinding(bindDef, $e);
        expect(binding).not.toBeNull();
        expect(binding?.getValue()).toBe(result);
    });


    test.each([
        ["hasClass('editable')", `<span class="a editable"></span>`, true, `<span class="a editable"></span>`],
        ["hasClass('editable')", `<span class="a editable"></span>`, false, `<span class="a"></span>`],
        ["hasClass('editable')", `<span class="b locked c"></span>`, false, `<span class="b locked c"></span>`],
        ["hasClass('editable')", `<span class="b locked c"></span>`, true, `<span class="b locked c editable"></span>`],

        ["notHasClass('editable')", `<span class="a editable"></span>`, true, `<span class="a"></span>`],
        ["notHasClass('editable')", `<span class="a editable"></span>`, false, `<span class="a editable"></span>`],
        ["notHasClass('editable')", `<span class="b locked c"></span>`, false, `<span class="b locked c editable"></span>`],
        ["notHasClass('editable')", `<span class="b locked c"></span>`, true, `<span class="b locked c"></span>`],

        ["classRegex('locked-(.*)')", `<span class="locked"></span>`, 'mood', `<span class="locked locked-mood"></span>`],
        ["classRegex('locked-(.*)')", `<span class="locked-abc"></span>`, 'efg', `<span class="locked-efg"></span>`],

        ["hasAttr('data-locked')", `<span data-locked></span>`, true, `<span data-locked=""></span>`],
        ["hasAttr('data-locked')", `<span data-locked></span>`, false, `<span></span>`],
        ["hasAttr('data-locked')", `<span data-open="false"></span>`, true, `<span data-open="false" data-locked=""></span>`],
        ["hasAttr('data-locked=silent')", `<span data-locked="silent"></span>`, true, `<span data-locked="silent"></span>`],
        ["hasAttr('data-locked=silent')", `<span></span>`, true, `<span data-locked="silent"></span>`],

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

        ["hasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, true, `<span style="height: 10px; width: 100px;"></span>`],
        ["hasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, false, `<span style="height: 10px;"></span>`],
        ["hasStyle('height:50px')", `<span style="width: 100px;"></span>`, true, `<span style="width: 100px; height: 50px;"></span>`],

        ["notHasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, true, `<span style="height: 10px;"></span>`],
        ["notHasStyle('width:100px')", `<span style="height:10px;width: 100px;"></span>`, false, `<span style="height: 10px; width: 100px;"></span>`],
        ["notHasStyle('height:50px')", `<span style="width: 100px;"></span>`, true, `<span style="width: 100px;"></span>`],

        ["styleRegex('width: (.*)px')", `<span style="width: 100px;"></span>`, "700", `<span style="width: 700px;"></span>`],
        ["styleRegex('width: (.*)px', null, 'number')", `<span style="width: 100px;"></span>`, 700, `<span style="width: 700px;"></span>`],

    ])('Create binding %s on %s. If sets value %s yields %s', (bindDef, elemDef, value, result) => {
        let $e = jQuery(elemDef)
        // Binding on the same element
        let binding = U.createBinding(bindDef, $e);
        expect(binding).not.toBeNull();
        binding?.setValue(value)
        expect($e.prop('outerHTML')).toBe(result);

        // Binding on a child
        $e = jQuery(`<div class="container">${elemDef}</div>`);
        if (bindDef.indexOf("null") > 0) {
            bindDef = bindDef.replace("null", "'span'");
        } else {
            bindDef = bindDef.substring(0, bindDef.length - 1) + ", 'span')";
        }
        binding = U.createBinding(bindDef, $e);
        expect(binding).not.toBeNull();
        binding?.setValue(value)
        expect($e.find("span").prop('outerHTML')).toBe(result);
    });

    test('User defined binding', () => {
        const $e = jQuery(`<span></span>`);
        const bindDef = {
            get: `(e) => {
                return e.hasClass('mood') && e.attr('role') !== undefined;
            }`,
            set: `(e, v) => {
                if(v) {
                    e.addClass('mood').attr('role', 'set');
                } else {
                    e.removeClass('mood').removeAttr('role'); 
                }
            }`,
        };
        const binding = U.createBinding(bindDef, $e);
        expect(binding).not.toBeNull();
        expect(binding?.getValue()).toBe(false);
        binding?.setValue(true);
        expect($e.prop('outerHTML')).toBe(`<span class="mood" role="set"></span>`);
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
        expect(U.toHexAlphaColor(" #ffaa0123")).toStrictEqual(["#ffaa01", 35/255]);
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

});