/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import jQuery from 'jquery';
const fs = require("fs");
const path = require("path");
const Mustache = require("mustache");

/**
 * @param {'picker' | 'params' | 'context'} name
 * @param {object} templateContext
 * @param {()=>void} [onHidden]
 * @returns {Promise<import('../src/service/modal_service').ModalDialogue>}
 */
const mockCreate = (name, templateContext, onHidden) => {
    const dir = path.resolve("../../templates");
    const filename = `${name}_modal.mustache`;
    let contents = fs.readFileSync(path.resolve(dir, filename), {encoding: 'utf8'})
        .replace('{{< core/modal }}', '<div class="modal">')
        .replace('{{$title}}', '<div class="modal-header" data-region="header"><h3 data-region="title">')
        .replace('{{/title}}', '</h3></div>')
        .replace('{{$body}}', '<div class="modal-body" data-region="body">')
        .replace('{{/body}}', '</div>')
        .replace('{{$footer}}', '<div class="modal-footer" data-region="footer">')
        .replace('{{/footer}}', '</div>')
        .replace('{{/ core/modal }}', '</div>');

    const context = {
        ...templateContext,
        str: function () {
            return function (/** @type {string} */ text) {
                return text.split(',')[0].trim();
            };
        },
    }
    const compiled = Mustache.render(contents, context);
    const root = jQuery(compiled);

    const setFormValues = function(/** @type {Record<String, *>} */ dict) {
        Object.keys(dict).forEach(key => {
            const val = dict[key];
            // @ts-ignore
            const elem = this.body.find(`[name="${key}"]`);
            if (elem) {
                if (elem.attr('type') === 'checkbox') {
                    elem.prop('checked', val);
                } else {
                    elem.val(val);
                }
            }
        });
    };

    /** @type {any} */
    const modal = {
        header: root.find('[data-region="header"]'),
        body: root.find('[data-region="body"]'),
        footer: root.find('[data-region="footer"]'),
        modal: root,
        show: jest.fn(),
        hide: jest.fn(),
        destroy: jest.fn(),
        twhRegisterListener: jest.fn().mockImplementation((e, evType, handler) => {
           e.addEventListener(evType, handler);
        })
    };
    modal.setFormValues = setFormValues.bind(modal);
    return Promise.resolve(modal);
}

module.exports = {
    create: jest.fn().mockImplementation(mockCreate)
}