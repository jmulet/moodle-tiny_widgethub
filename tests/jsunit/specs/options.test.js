/**
 * @jest-environment jsdom
 */
require('./module.mocks')(jest);
document?.body?.setAttribute("id", "page-mod-page-mod");

const { register, getWidgetDict, Shared, Widget, applyPartials } = require('../src/options');


/** @type {import('../src/options').RawWidget} */
const rawSnpt = {
    "id": 1,
    "name": "Capsa multi-propòsit",
    "key": "box1",
    "instructions": "<b>Alerta</b>: Serveix per informar d'una errada o situació greu a tenir en compte. <br> <b>Ampliació</b>: Marcau que el material és d'ampliació per als alumnes.<br> <b>Consell</b>: Donau un consell als alumnes.<br> <b>Important</b>: Remarcar que és un contingut rellevant que cal estudiar.<br> <b>Introducció</b>: Serveix per introduir un lliurament o una secció d'ell.  Triau una mida i idioma per a la capsa.\n",
    "template": "<p><br></p><!--begin: Capsa {{tipus}} {{mida}} -->\n<div class=\"iedib-capsa iedib-capsa-{{mida}} iedib-{{tipus}}-border\" data-lang=\"{{LANG}}\">\n  <div class=\"iedib-lateral iedib-{{tipus}}\">\n    <p class=\"iedib-titolLateral\">{{#I18n}}msg_{{tipus}}{{/I18n}}<span class=\"iedib-{{tipus}}-logo\"></span></p>\n  </div>\n  <div class=\"iedib-central\">\n   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna\n   aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n   Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint\n   occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>\n  </div>\n</div>\n<!--end: Capsa {{tipus}} {{mida}}--> <p><br></p>\n",
    "version": "1.0.0",
    "author": "J.Mulet",
    "category": "capses",
    "insertquery": ".iedib-central",
    "selectors": ".iedib-capsa.iedib-alerta-border,.iedib-capsa.iedib-ampliacio-border,.iedib-capsa.iedib-consell-border,.iedib-capsa.iedib-important-border,.iedib-capsa.iedib-introduccio-border",
    "unwrap": "div.iedib-central > *",
    "I18n": {
        "msg_alerta": { "ca": "ALERTA", "es": "ALERTA", "en": "WATCH OUT", "fr": "ATTENTION", "de": "ACHTUNG" },
        "msg_ampliacio": { "ca": "AMPLIACIÓ", "es": "AMPLIACIÓN", "en": "EXTENSION", "fr": "EXTENSION", "de": "ERWEITERUNG" },
        "msg_consell": { "ca": "CONSELL", "es": "CONSEJO", "en": "ADVICE", "fr": "CONSEIL", "de": "TIPP" },
        "msg_important": { "ca": "IMPORTANT", "es": "IMPORTANTE", "en": "IMPORTANT", "fr": "IMPORTANT", "de": "WICHTIG" },
        "msg_introduccio": { "ca": "INTRODUCCIÓ", "es": "INTRODUCIÓN", "en": "INTRODUCTION", "fr": "INTRODUCTION", "de": "EINFÜHRUNG" }
    },
    "parameters": [
        { "name": "tipus", "value": "alerta", "title": "Propòsit de la capsa", "type": "select", "options": [{ "v": "alerta", "l": "Alerta" }, { "v": "ampliacio", "l": "Ampliació" }, { "v": "consell", "l": "Consell" }, { "v": "important", "l": "Important" }, { "v": "introduccio", "l": "Introducció" }] },
        { "name": "mida", "value": "gran", "title": "Mida de la capsa", "type": "select", "options": [{ "v": "gran", "l": "Gran" }, { "v": "mitjana", "l": "Mitjana" }, { "v": "petita", "l": "Petita" }] },
        { "name": "LANG", "value": "CA", "title": "Idioma", "type": "select", "options": [{ "v": "ca", "l": "Català" }, { "v": "es", "l": "Castellà" }, { "v": "en", "l": "English" }, { "v": "fr", "l": "Francès" }, { "v": "de", "l": "Alemany" }] }]
};

/** @type {import('../src/options').RawWidget} */
const rawSnpt2 = {
    "id": 2,
    "name": "Capsa multi-propòsit",
    "key": "box2",
    "category": "MISC",
    "instructions": "<b>Alerta</b>: Serveix per informar d'una errada o situació greu a tenir en compte. <br> <b>Ampliació</b>: Marcau que el material és d'ampliació per als alumnes.<br> <b>Consell</b>: Donau un consell als alumnes.<br> <b>Important</b>: Remarcar que és un contingut rellevant que cal estudiar.<br> <b>Introducció</b>: Serveix per introduir un lliurament o una secció d'ell.  Triau una mida i idioma per a la capsa.\n",
    "template": "<p><br></p><!--begin: Capsa {{tipus}} {{mida}} -->\n<div class=\"iedib-capsa iedib-capsa-{{mida}} iedib-{{tipus}}-border\" data-lang=\"{{LANG}}\">\n  <div class=\"iedib-lateral iedib-{{tipus}}\">\n    <p class=\"iedib-titolLateral\">{{#I18n}}msg_{{tipus}}{{/I18n}}<span class=\"iedib-{{tipus}}-logo\"></span></p>\n  </div>\n  <div class=\"iedib-central\">\n   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna\n   aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n   Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint\n   occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>\n  </div>\n</div>\n<!--end: Capsa {{tipus}} {{mida}}--> <p><br></p>\n",
    "version": "2023.01.07",
    "author": "J.Mulet",
    "I18n": {
        "msg_alerta": { "ca": "ALERTA", "es": "ALERTA", "en": "WATCH OUT", "fr": "ATTENTION", "de": "ACHTUNG" },
        "msg_ampliacio": { "ca": "AMPLIACIÓ", "es": "AMPLIACIÓN", "en": "EXTENSION", "fr": "EXTENSION", "de": "ERWEITERUNG" },
        "msg_consell": { "ca": "CONSELL", "es": "CONSEJO", "en": "ADVICE", "fr": "CONSEIL", "de": "TIPP" },
        "msg_important": { "ca": "IMPORTANT", "es": "IMPORTANTE", "en": "IMPORTANT", "fr": "IMPORTANT", "de": "WICHTIG" },
        "msg_introduccio": { "ca": "INTRODUCCIÓ", "es": "INTRODUCIÓN", "en": "INTRODUCTION", "fr": "INTRODUCTION", "de": "EINFÜHRUNG" }
    },
    "for": "55, 11",
    "scope": "^page-mod-(book|assign|quiz)-",
    "parameters": [
        { "name": "tipus", "value": "alerta", "title": "Propòsit de la capsa", "type": "select", "options": [{ "v": "alerta", "l": "Alerta" }, { "v": "ampliacio", "l": "Ampliació" }, { "v": "consell", "l": "Consell" }, { "v": "important", "l": "Important" }, { "v": "introduccio", "l": "Introducció" }] },
        { "name": "mida", "value": "gran", "title": "Mida de la capsa", "type": "select", "options": [{ "v": "gran", "l": "Gran" }, { "v": "mitjana", "l": "Mitjana" }, { "v": "petita", "l": "Petita" }] },
        { "name": "LANG", "value": "CA", "title": "Idioma", "type": "select", "options": [{ "v": "ca", "l": "Català" }, { "v": "es", "l": "Castellà" }, { "v": "en", "l": "English" }, { "v": "fr", "l": "Francès" }, { "v": "de", "l": "Alemany" }] }]
};

/** @type {import('../src/options').RawWidget} */
const rawSnpt3 = {
    "id": 3,
    "name": "Capsa multi-propòsit",
    "key": "box3",
    "category": "MISC",
    "instructions": "<b>Alerta</b>: Serveix per informar d'una errada o situació greu a tenir en compte. <br> <b>Ampliació</b>: Marcau que el material és d'ampliació per als alumnes.<br> <b>Consell</b>: Donau un consell als alumnes.<br> <b>Important</b>: Remarcar que és un contingut rellevant que cal estudiar.<br> <b>Introducció</b>: Serveix per introduir un lliurament o una secció d'ell.  Triau una mida i idioma per a la capsa.\n",
    "template": "<p><br></p><!--begin: Capsa {{tipus}} {{mida}} -->\n<div class=\"iedib-capsa iedib-capsa-{{mida}} iedib-{{tipus}}-border\" data-lang=\"{{LANG}}\">\n  <div class=\"iedib-lateral iedib-{{tipus}}\">\n    <p class=\"iedib-titolLateral\">{{#I18n}}msg_{{tipus}}{{/I18n}}<span class=\"iedib-{{tipus}}-logo\"></span></p>\n  </div>\n  <div class=\"iedib-central\">\n   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna\n   aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n   Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint\n   occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>\n  </div>\n</div>\n<!--end: Capsa {{tipus}} {{mida}}--> <p><br></p>\n",
    "version": "2023.01.07",
    "author": "J.Mulet",
    "I18n": {
        "msg_alerta": { "ca": "ALERTA", "es": "ALERTA", "en": "WATCH OUT", "fr": "ATTENTION", "de": "ACHTUNG" },
        "msg_ampliacio": { "ca": "AMPLIACIÓ", "es": "AMPLIACIÓN", "en": "EXTENSION", "fr": "EXTENSION", "de": "ERWEITERUNG" },
        "msg_consell": { "ca": "CONSELL", "es": "CONSEJO", "en": "ADVICE", "fr": "CONSEIL", "de": "TIPP" },
        "msg_important": { "ca": "IMPORTANT", "es": "IMPORTANTE", "en": "IMPORTANT", "fr": "IMPORTANT", "de": "WICHTIG" },
        "msg_introduccio": { "ca": "INTRODUCCIÓ", "es": "INTRODUCIÓN", "en": "INTRODUCTION", "fr": "INTRODUCTION", "de": "EINFÜHRUNG" }
    },
    "for": "5",
    "scope": "^page-mod-(book|page|assign|quiz)-",
    "parameters": [
        { "name": "tipus", "value": "alerta", "title": "Propòsit de la capsa", "type": "select", "options": [{ "v": "alerta", "l": "Alerta" }, { "v": "ampliacio", "l": "Ampliació" }, { "v": "consell", "l": "Consell" }, { "v": "important", "l": "Important" }, { "v": "introduccio", "l": "Introducció" }] },
        { "name": "mida", "value": "gran", "title": "Mida de la capsa", "type": "select", "options": [{ "v": "gran", "l": "Gran" }, { "v": "mitjana", "l": "Mitjana" }, { "v": "petita", "l": "Petita" }] },
        { "name": "LANG", "value": "CA", "title": "Idioma", "type": "select", "options": [{ "v": "ca", "l": "Català" }, { "v": "es", "l": "Castellà" }, { "v": "en", "l": "English" }, { "v": "fr", "l": "Francès" }, { "v": "de", "l": "Alemany" }] }]
};

/** @type {*} */
let fakeEditor;

describe('Options', () => {

    beforeEach(() => {
        fakeEditor = require('./editor.mock')();
    });

    test('must register options',() => {
        // Do the call
        register(fakeEditor);
        // And expect
        const registerOption = fakeEditor.options.register;
        expect(registerOption).toHaveBeenNthCalledWith(1, "showplugin", expect.any(Object));
        expect(registerOption).toHaveBeenNthCalledWith(2, "userid", expect.any(Object));
        expect(registerOption).toHaveBeenNthCalledWith(3, "courseid", expect.any(Object));
        expect(registerOption).toHaveBeenNthCalledWith(4, "widgetlist", expect.any(Object));
        expect(registerOption).toHaveBeenNthCalledWith(5, "sharestyles", expect.any(Object));
        expect(registerOption).toHaveBeenNthCalledWith(6, "additionalcss", expect.any(Object));
    });

    test('It returns the dictionary of widgets', () => {
        const fakeEditor = {
            id: 1,
            options: {
                get: jest.fn().mockImplementation((param) => {
                    if(param === "widgetlist") {
                        return [rawSnpt, rawSnpt2, rawSnpt3];
                    } else if(param === "userid") {
                        return 5
                    }
                })
            }
        };
        const dict1 = getWidgetDict(fakeEditor);
        const dict2 = getWidgetDict(fakeEditor);
        // It is a singleton
        expect(Object.is(dict1, dict2)).toBe(true);
        expect(Object.keys(dict1)).toHaveLength(2);
        expect(dict1['box1']).toBeInstanceOf(Widget);
        expect(dict1['box3']).toBeInstanceOf(Widget);
    })

    test('correct scope is detected', () => {
        expect(Shared.currentScope).toBe("page-mod-page-mod");
    });

    test('basic usage', () => {
        const snpt = new Widget({ ...rawSnpt });
        expect(snpt.name).toBe(rawSnpt.name);
        expect(snpt.key).toBe(rawSnpt.key);
        expect(typeof (snpt.defaults)).toBe("object");
        expect(snpt.defaults).toStrictEqual({
            "tipus": "alerta",
            "mida": "gran",
            "LANG": "CA"
        });
    });

    test('is suitable in scope', () => {
        let snpt = new Widget({ ...rawSnpt });
        expect(snpt.isUsableInScope()).toBe(true);
        snpt = new Widget({ ...rawSnpt3 });
        expect(snpt.isUsableInScope()).toBe(true);
    });

    test('not suitable in scope', () => {
        const snpt = new Widget({ ...rawSnpt2 });
        expect(snpt.isUsableInScope()).toBe(false);
    });

    test('is available for any user', () => {
        const snpt = new Widget({ ...rawSnpt });
        expect(snpt.isFor(42)).toBe(true);
        expect(snpt.isFor(11)).toBe(true);
        expect(snpt.isFor(0)).toBe(true);
    });

    test('not available in scope because hidden', () => {
        let snpt = new Widget({ ...rawSnpt2, hidden: false });
        expect(snpt.isFor(55)).toBe(true);
        snpt = new Widget({ ...rawSnpt2, hidden: true });
        expect(snpt.isFor(55)).toBe(false);
    });

    test('not available in scope because not in list', () => {
        const snpt = new Widget({ ...rawSnpt3 });
        expect(snpt.isFor(52)).toBe(false);
        expect(snpt.isFor(7)).toBe(false);
        expect(snpt.isFor(2)).toBe(false);
        expect(snpt.isFor(1)).toBe(false); // because admin
        expect(snpt.isFor(3)).toBe(false);  
    });

    test('available in scope because it is in list', () => {
        const snpt = new Widget({ ...rawSnpt3 });
        expect(snpt.isFor(5)).toBe(true);
        expect(snpt.isFor(42)).toBe(false);
        expect(snpt.isFor(555)).toBe(false);
        expect(snpt.isFor(0)).toBe(false); // admin
        expect(snpt.isFor(1)).toBe(false); // admin
        expect(snpt.isFor(2)).toBe(false);
    });

    test('Should expand the template with partials', () => {
        const partial = {
            "LOREM": 'Lorem ipsum dolor it.'
        }
        let snpt = {...rawSnpt, template: '<p>__LOREM__</p>'};
        applyPartials(snpt, partial);
        expect(snpt.template).toBe('<p>Lorem ipsum dolor it.</p>');

        snpt = {...rawSnpt, template:
        `<p><br></p> 
        <!--begin: Capsa solució -->
        <div class="iedib-capsa iedib-solucio">
        <div class="iedib-central">
        <p>__LOREM__</p>
        </div>
        </div>
        <!--end: Capsa solució--> 
        <p><br></p>`};
        applyPartials(snpt, partial);
        expect(snpt.template.indexOf("__LOREM__")>=0).toBe(false);
        expect(snpt.template.indexOf("<p>Lorem ipsum dolor it.</p>")>=0).toBe(true);
    });

    test('It should expand partials on parameters', () => {
        const partial = {
            ID: {name: 'id', title: 'Identifier', value: '$RND'}
        };
        /** @type {*} */
        let snpt = {...rawSnpt, parameters: ['__ID__']};
        applyPartials(snpt, partial);
        expect(snpt.parameters[0]).toStrictEqual({...partial.ID, type: 'textfield'});

        /** @type {*} */
        snpt = {...rawSnpt, parameters: [{partial: '__ID__'}]};
        applyPartials(snpt, partial);
        expect(snpt.parameters[0]).toStrictEqual({...partial.ID, type: 'textfield'});

         /** @type {*} */
         snpt = {...rawSnpt, parameters: [{partial: '__ID__', value: '12345'}]};
         applyPartials(snpt, partial);
         expect(snpt.parameters[0]).toStrictEqual({...partial.ID, type: 'textfield', value: '12345'});
    });



});