/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require('../module.mocks')(jest);
const { TemplateSrv } = require("../../src/service/template_service");
const Mustache = require("mustache");

const EJS = require('ejs');
/** @type {*} */
const ejsLoader = () => Promise.resolve(EJS);
/**
 * @type {TemplateSrv}
 */
let templateSrv; 

const context = {
    lastname: "Josep",
    showMe: 0,
    opt: 'red',
    n: 3,
    k: 1,
    two: 2,
    five: 5,
    four: 4,
    "_lang": "en"
};

const translations = {
    "snptKey": {
        "ca": "Alerta",
        "en": "Watch out!"
    }
};

describe('TemplateSrv', () => {

    beforeEach( ()=> {
        templateSrv = new TemplateSrv(Mustache, ejsLoader);
    });

    describe("EJS tests", () => {
        test.each([
            ['Hi <%= name %>!', {name: 'Moodle'}, "Hi Moodle!"],
            ["<%= name === 'Moodle' ? 'LMS' : 'Not' %>", {name: 'Moodle'}, "LMS"],
            ["<%= I18n['animal'] %>", {_lang: 'es'}, "gato"],
            ["{{#I18n}}animal{{/I18n}}", {_lang: 'en'}, "cat"],
        ])('Test ejs template renderer', async (template, ctx, expected) => {
            const translations = {
                "animal": {
                    "en": "cat",
                    "es": "gato"
                },
            }
            const result = await templateSrv.render(template, ctx, translations)
            expect(result).toBe(expected);
        });
    });

    describe('Mustache Extended tests', () => {

        test("Mocked mustache works as expected", () => {
            expect(Mustache.render('Hello {{w}}!', {w: 'World'})).toBe('Hello World!');
        });
        
        test.each([
            ["Simple test", "Hello {{lastname}}{{#showMe}}Not shown{{/showMe}} {{#n}}YES{{/n}}", "Hello Josep YES"],
            ["Simple numeric if", "Hello {{#k}}shown{{/k}}", "Hello shown"],
            ["If condition", "Hello {{#if}}[n+k>=4]{{lastname}}{{/if}}", "Hello Josep"],
            ["Define a variable", "Hello {{#var}}j=1+k{{/var}}{{#if}}[j==2]{{lastname}}{{/if}}", "Hello Josep"],
            ["Define a loop", "Hello {{#for}}[i=1;i<=n]World-{{i}} {{/for}}", "Hello World-1 World-2 World-3 "],
            ["Inner loops", "{{#for}}[i=1;i<3]{{#for}}[j=1;j<3] {{#eval}}(i+j)%2{{/eval}}{{/for}}{{/for}}", " 0 1 1 0"],
            ["Simplified loop notation", "{{#each}}[five]{{i}}{{/each}}", "12345"],
            ["Simplified loop notation using alias", "{{#each}}[four]{{#var}}i0=2*i{{/var}}{{i0}}{{/each}}", "2468"],
            ["Nested simplified loop notation using alias", "{{#each}}[i=two]{{#each}}[j=3]{{i}}-{{j}} {{/each}}{{/each}}", "1-1 1-2 1-3 2-1 2-2 2-3 "],
            ["Inner loops 2", "{{#for}}[i=1;i<3]{{#for}}[j=1;j<4] {{i}}-{{j}}{{/for}}{{/for}}", " 1-1 1-2 1-3 2-1 2-2 2-3"],
            ["Simplified matrix notation 1", "{{#each}}[2,3]{{i}}-{{j}} {{/each}}", "1-1 1-2 1-3 2-1 2-2 2-3 "],
            ["Simplified matrix notation 2", "{{#each}}[a=2,b=3]{{a}}-{{b}} {{/each}}", "1-1 1-2 1-3 2-1 2-2 2-3 "],
            ["Eval functions", "Hello {{#eval}}4+4{{/eval}}", "Hello 8"]
        ])("%s", (_, template, rendered) => {
            const out = templateSrv.renderMustache(template, context, translations);
            expect(out).toBe(rendered);
        });
         
        test("Translations", ()=> {
            let out = templateSrv.renderMustache("Aquest és l'widget {{#I18n}}snptKey{{/I18n}}", context, translations);
            expect(out).toBe("Aquest és l'widget Watch out!");
            context["_lang"] = "ca"
            out = templateSrv.renderMustache("Aquest és l'widget {{#I18n}}snptKey{{/I18n}}", context, translations);
            expect(out).toBe("Aquest és l'widget Alerta");
            context["_lang"] = "ru"
            out = templateSrv.renderMustache("Aquest és l'widget {{#I18n}}snptKey{{/I18n}}", context, translations);
            expect(out).toBe("Aquest és l'widget Watch out!");
            context["_lang"] = "ru"
            out = templateSrv.renderMustache("Aquest és l'widget {{#I18n}}notFound{{/I18n}}", context, translations);
            expect(out).toBe("Aquest és l'widget notFound");
        });
    });
})
