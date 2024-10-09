/**
 * @jest-environment jsdom
 */
document?.body?.setAttribute("id", "page-mod-page-mod");

// Mock virtual modules
jest.mock("core/config", () => ({
    __esModule: true,
    wwwroot: "https://server.com"
}), { virtual: true });

jest.mock("editor_tiny/options", () => ({
    __esModule: true,
    /**
     * @param {string} pluginname 
     * @param {string} key 
     * @returns {string}
     */
    getPluginOptionName: (pluginname, key) => key
}), { virtual: true });

const { Shared, WidgetWrapper } = require('../src/options');


/** @type {import('../src/options').Widget} */
const rawSnpt = {
    "id": 1,
    "name": "Capsa multi-propòsit",
    "key": "capsa-generica",
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

/** @type {import('../src/options').Widget} */
const rawSnpt2 = {
    "id": 2,
    "name": "Capsa multi-propòsit",
    "key": "capsa-generica",
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
    "for": "5,42,555",
    "scope": "^page-mod-(book|assign|quiz)-",
    "parameters": [
        { "name": "tipus", "value": "alerta", "title": "Propòsit de la capsa", "type": "select", "options": [{ "v": "alerta", "l": "Alerta" }, { "v": "ampliacio", "l": "Ampliació" }, { "v": "consell", "l": "Consell" }, { "v": "important", "l": "Important" }, { "v": "introduccio", "l": "Introducció" }] },
        { "name": "mida", "value": "gran", "title": "Mida de la capsa", "type": "select", "options": [{ "v": "gran", "l": "Gran" }, { "v": "mitjana", "l": "Mitjana" }, { "v": "petita", "l": "Petita" }] },
        { "name": "LANG", "value": "CA", "title": "Idioma", "type": "select", "options": [{ "v": "ca", "l": "Català" }, { "v": "es", "l": "Castellà" }, { "v": "en", "l": "English" }, { "v": "fr", "l": "Francès" }, { "v": "de", "l": "Alemany" }] }]
};

/** @type {import('../src/options').Widget} */
const rawSnpt3 = {
    "id": 3,
    "name": "Capsa multi-propòsit",
    "key": "capsa-generica",
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
    "for": "5,42,555",
    "scope": "^page-mod-(book|page|assign|quiz)-",
    "parameters": [
        { "name": "tipus", "value": "alerta", "title": "Propòsit de la capsa", "type": "select", "options": [{ "v": "alerta", "l": "Alerta" }, { "v": "ampliacio", "l": "Ampliació" }, { "v": "consell", "l": "Consell" }, { "v": "important", "l": "Important" }, { "v": "introduccio", "l": "Introducció" }] },
        { "name": "mida", "value": "gran", "title": "Mida de la capsa", "type": "select", "options": [{ "v": "gran", "l": "Gran" }, { "v": "mitjana", "l": "Mitjana" }, { "v": "petita", "l": "Petita" }] },
        { "name": "LANG", "value": "CA", "title": "Idioma", "type": "select", "options": [{ "v": "ca", "l": "Català" }, { "v": "es", "l": "Castellà" }, { "v": "en", "l": "English" }, { "v": "fr", "l": "Francès" }, { "v": "de", "l": "Alemany" }] }]
};

describe('widgetWrapper', () => {
    test('correct scope is detected', () => {
        expect(Shared.currentScope).toBe("page-mod-page-mod");
    });

    test('basic usage', () => {
        const snpt = new WidgetWrapper({ ...rawSnpt });
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
        let snpt = new WidgetWrapper({ ...rawSnpt });
        expect(snpt.isUsableInScope()).toBe(true);
        snpt = new WidgetWrapper({ ...rawSnpt3 });
        expect(snpt.isUsableInScope()).toBe(true);
    });

    test('not suitable in scope', () => {
        const snpt = new WidgetWrapper({ ...rawSnpt2 });
        expect(snpt.isUsableInScope()).toBe(false);
    });

    test('is available for user', () => {
        const snpt = new WidgetWrapper({ ...rawSnpt });
        expect(snpt.isFor(42)).toBe(true);
    });

    test('not available in scope because hidden', () => {
        const snpt = new WidgetWrapper({ ...rawSnpt2 });
        expect(snpt.isFor(52)).toBe(false);
    });

    test('not available in scope because not in list', () => {
        const snpt = new WidgetWrapper({ ...rawSnpt3 });
        expect(snpt.isFor(52)).toBe(false);
        expect(snpt.isFor(7)).toBe(false);
        expect(snpt.isFor(2)).toBe(true); // because admin
        expect(snpt.isFor(1)).toBe(true); // because admin
        expect(snpt.isFor(3)).toBe(false); // because admin
    });

    test('available in scope because it is in list', () => {
        const snpt = new WidgetWrapper({ ...rawSnpt3 });
        expect(snpt.isFor(5)).toBe(true);
        expect(snpt.isFor(42)).toBe(true);
        expect(snpt.isFor(555)).toBe(true);
    });
});