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
 * HTML sanitizer used for the output of the sandboxed template workers.
 *
 * @module     tiny_widgethub/sanitize
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** @type {Set<string>} */
const FORBIDDEN_TAGS = new Set(['SCRIPT', 'STYLE', 'FORM', 'TEXTAREA',
    'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'SVG', 'MATH',
    'FRAME', 'FRAMESET', 'APPLET', 'PORTAL', 'NOSCRIPT', 'TEMPLATE']);

/** @type {RegExp} */
const SAFE_PROTOCOLS = /^(?:https?:|mailto:|tel:|#)/i;

/** @type {Set<string>} Attributes whose value is, or contains, a URL. */
const URL_ATTRIBUTES = new Set(['action', 'background', 'data', 'formaction',
    'href', 'ping', 'poster', 'src', 'srcset', 'xlink:href']);

/**
 * Checks whether a URL value uses an allowed protocol.
 * @param {string} value
 * @returns {boolean}
 */
function hasSafeProtocol(value) {
    return SAFE_PROTOCOLS.test(value.trim());
}

/**
 * Checks whether a URL-bearing attribute is safe. srcset holds a
 * comma-separated list of URLs, optionally followed by a descriptor.
 * @param {string} name
 * @param {string} value
 * @returns {boolean}
 */
function isSafeUrlAttribute(name, value) {
    if (name !== 'srcset') {
        return hasSafeProtocol(value);
    }
    return value.split(',').every(candidate => {
        const url = candidate.trim().split(/\s+/)[0];
        return !url || hasSafeProtocol(url);
    });
}

/**
 * Sanitizes the rendered HTML by removing potentially dangerous tags and attributes.
 * @param {string} renderedHTML - The rendered HTML to sanitize.
 * @returns {string} The sanitized HTML.
 */
export function sanitize(renderedHTML) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(renderedHTML, 'text/html');

    doc.querySelectorAll('*').forEach(el => {
        const tagName = el.tagName.toUpperCase();
        if (FORBIDDEN_TAGS.has(tagName)) {
            el.remove();
            return;
        }
        if ((tagName === 'BUTTON' || tagName === 'INPUT') && el.hasAttribute('formaction')) {
            el.remove();
            return;
        }
        if (tagName === 'IFRAME') {
            const src = el.getAttribute('src');
            if (!src || !hasSafeProtocol(src)) {
                el.remove();
                return;
            }
        }
        [...el.attributes].forEach(attr => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on') || name.startsWith('form') ||
                name === 'srcdoc' || name === 'sandbox' ||
                (URL_ATTRIBUTES.has(name) && !isSafeUrlAttribute(name, attr.value))) {
                el.removeAttribute(attr.name);
            }
        });
        if (tagName === 'IFRAME') {
            el.setAttribute('sandbox', 'allow-scripts');
        }
    });
    return doc.body.innerHTML;
}
