
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
/**
 * Module to handle context menu on IFRAMEs by making them "transparent" to mouse events
 * and calculating clicks mathematically.
 * @param {import("../plugin").TinyMCE} editor
 */
export function enableIframeBubble(editor) {

    // Tracks which iframe is currently "awake" (interactive mode)
    /** @type {HTMLElement | null} */
    let activeIframe = null;

    // 1. Inject CSS to make IFRAMEs transparent to pointer events.
    // This allows clicks to pass through the iframe and hit the editor body.
    editor.dom.addStyle(`
        iframe { 
            pointer-events: none; 
            user-select: none;
            display: block; 
            box-sizing: border-box;
            border: 3px solid transparent; 
            transition: border-color 0.1s ease;
        }  
        iframe[data-mce-selected="1"] {
            outline: 3px solid #b4d7ff;
        }   
        iframe.twh_iframe-interactive-mode {
            pointer-events: auto !important;
            border: 4px solid #4caf50 !important;
        }
    `);

    /**
     * Checks if a point (x, y) is inside a DOMRect.
     * @param {number} x - Client X coordinate
     * @param {number} y - Client Y coordinate
     * @param {DOMRect} rect - The bounding rectangle of the element
     * @returns {boolean}
     */
    const isInside = (x, y, rect) => {
        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    };

    /**
     * Helper to lock the iframe again (disable interaction)
     */
    const deactivateCurrentIframe = () => {
        if (activeIframe) {
            editor.dom.removeClass(activeIframe, 'twh_iframe-interactive-mode');
            activeIframe = null;
        }
    };

    /**
     * Handles interaction logic.
     * Since pointer-events: none is active, the event target will be the container/body,
     * not the iframe. We must manually check if the click coordinates overlap with an iframe.
     * @param {MouseEvent} ev
     */
    const handleInteraction = (ev) => {
        // CLEANUP: If clicking anywhere without ALT, lock any active iframe
        if (!ev.altKey && activeIframe) {
            deactivateCurrentIframe();
        }

        // Get all iframes currently in the viewport
        const iframes = editor.dom.select('iframe');
        let clickedIframe = null;

        for (const iframe of iframes) {
            const rect = iframe.getBoundingClientRect();
            // We use clientX/Y because getBoundingClientRect is relative to the viewport
            if (isInside(ev.clientX, ev.clientY, rect)) {
                clickedIframe = iframe;
                break;
            }
        }

        if (!clickedIframe || ev.type !== 'click') {
            return;
        }
        // --- CASE B: Left Click ---
        // Interaction Logic: ALT + Click to "Wake up"
        if (ev.altKey) {
            ev.preventDefault();
            ev.stopImmediatePropagation();

            if (clickedIframe !== activeIframe) {
                deactivateCurrentIframe(); // Close others
                // Activate this one
                activeIframe = clickedIframe;
                editor.dom.addClass(clickedIframe, 'twh_iframe-interactive-mode');
            }
        } else {
            // Standard Click: Just select the node
            editor.selection.select(clickedIframe);
        }
    };

    // Attach listeners to the main editor area
    editor.on('click', handleInteraction);
    // Safety Cleanup: If the editor regains focus (user clicked back on text), lock iframes.
    // This handles the case where user clicked inside YouTube (blur) and then clicked back to edit (focus).
    editor.on('focus', () => {
        deactivateCurrentIframe();
    });
}
