// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {subscribe} from "../extension";
import {getGlobalConfig} from "../options";
import Common from '../common';
import * as coreStr from "core/str";

// List of Bootstrap 4 data attribute suffixes (in kebab-case)
// that are namespaced in Bootstrap 5.
const bs4DataAttributeSuffixes = [
    // General triggers and component identifiers
    'toggle',
    'target',
    'parent',
    'ride',
    'slide',
    'slide-to',
    // Options and configurations
    'placement',
    'trigger',
    'content',
    'container',
    'original-title',
    'html',
];

// Create a CSS selector string to find elements with any of the BS4 data attributes
const bs5Selectors = bs4DataAttributeSuffixes.map(suffix => `[data-${suffix}]`).join(',');

/**
 * @param {import("../plugin").TinyMCE} editor
 * @returns {boolean}
 */
export function bs5Refractor(editor) {
    const body = editor.getBody();
    let changes = 0;

    // Select all elements that match the generated selector.
    /** @type {HTMLElement[]} */
    const elementsWithBs4DataAttributes = body.querySelectorAll(bs5Selectors);

    elementsWithBs4DataAttributes.forEach(element => {
        // Iterate over the list of known BS4 data attribute suffixes
        bs4DataAttributeSuffixes.forEach(kebabCaseSuffix => {
            const oldAttrName = `data-${kebabCaseSuffix}`;

            // Check if the element has the old attribute
            if (element.hasAttribute(oldAttrName)) {
                const attrValue = element.getAttribute(oldAttrName);
                const newAttrName = `data-bs-${kebabCaseSuffix}`;
                // Add or update the new Bootstrap 5 attribute if it's not already set to the correct value.
                // This "duplicates" by ensuring the data-bs-xxx attribute exists with the same value.
                // It does not remove the old data-xxx attribute in this refactor.
                if (attrValue !== null) {
                    if (element.getAttribute(newAttrName) !== attrValue) {
                        element.setAttribute(newAttrName, attrValue);
                        changes++;
                    }
                } else {
                    element.removeAttribute(newAttrName);
                    changes++;
                }
            }
        });
    });

    return changes > 0;
}

/**
 * @param {import("../plugin").TinyMCE} editor
 */
export async function refractoring(editor) {
    try {
        const refractoringActive = getGlobalConfig(editor, 'oninit.refractor.bs5', '0');
        let changes = false;
        if (refractoringActive === '1') {
            changes = bs5Refractor(editor);
        }
        if (changes) {
            const saverequired = await coreStr.get_string('saverequired', Common.component);
            editor.notificationManager.open({
                text: saverequired,
                type: 'warning',
                timeout: 4000
            });
        }
    } catch (ex) {
        // eslint-disable-next-line no-console
        console.error("Error while applying bs5 refractor:", ex);
    }
}

subscribe('onInit', refractoring);