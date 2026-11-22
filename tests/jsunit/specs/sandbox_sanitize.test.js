/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/sanitize
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const { sanitize } = require('../../../libs/src/sandbox/sanitize.js');

/**
 * @param {string} html
 * @returns {Document}
 */
function parse(html) {
    return new DOMParser().parseFromString(html, 'text/html');
}

describe('Render sandbox sanitizer', () => {
    test('removes form controls carrying formaction', () => {
        const html = sanitize('<button formaction="javascript:alert(1)">go</button>' +
            '<input formaction="https://example.com/evil">' +
            '<div formaction="javascript:alert(2)">ok</div>');
        const doc = parse(html);
        expect(doc.querySelector('button')).toBeNull();
        expect(doc.querySelector('input')).toBeNull();
        expect(doc.querySelector('div').hasAttribute('formaction')).toBe(false);
    });

    test.each([
        'action', 'background', 'data', 'formaction', 'href',
        'ping', 'poster', 'src', 'xlink:href'
    ])('filters javascript: URLs in %s attributes', (name) => {
        const html = sanitize(`<div ${name}="javascript:alert(1)">x</div>`);
        expect(parse(html).querySelector('div').hasAttribute(name)).toBe(false);
    });

    test('drops srcset containing an unsafe candidate', () => {
        const html = sanitize('<img srcset="javascript:alert(1) 1x, https://example.com/a.png 2x">');
        expect(parse(html).querySelector('img').hasAttribute('srcset')).toBe(false);

        const safe = sanitize('<img srcset="https://example.com/a.png 1x, https://example.com/b.png 2x">');
        expect(parse(safe).querySelector('img').getAttribute('srcset'))
            .toBe('https://example.com/a.png 1x, https://example.com/b.png 2x');
    });

    test('keeps safe URLs and ordinary attributes', () => {
        const html = sanitize('<a href="https://example.com" title="ok" class="c">link</a>');
        const link = parse(html).querySelector('a');
        expect(link.getAttribute('href')).toBe('https://example.com');
        expect(link.getAttribute('title')).toBe('ok');
        expect(link.getAttribute('class')).toBe('c');
    });

    test('removes event handlers, srcdoc and supplied sandbox values', () => {
        const html = sanitize('<iframe src="https://example.com" srcdoc="hello" ' +
            'sandbox="allow-same-origin" onclick="evil()"></iframe>');
        const iframe = parse(html).querySelector('iframe');
        expect(iframe).not.toBeNull();
        expect(iframe.hasAttribute('srcdoc')).toBe(false);
        expect(iframe.hasAttribute('onclick')).toBe(false);
        expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    });

    test('removes iframes without a safe src', () => {
        expect(parse(sanitize('<iframe srcdoc="hello"></iframe>')).querySelector('iframe')).toBeNull();
        expect(parse(sanitize('<iframe src="javascript:alert(1)"></iframe>')).querySelector('iframe')).toBeNull();
    });

    test('removes dangerous tags', () => {
        const html = sanitize('<script>alert(1)</script><form action="https://example.com"></form>' +
            '<svg><a xlink:href="javascript:alert(1)"></a></svg><div>ok</div>');
        const doc = parse(html);
        expect(doc.querySelector('script')).toBeNull();
        expect(doc.querySelector('form')).toBeNull();
        expect(doc.querySelector('svg')).toBeNull();
        expect(doc.querySelector('div').textContent).toBe('ok');
    });
});
