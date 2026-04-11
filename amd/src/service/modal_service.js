/* eslint-disable max-len */
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
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Modal from 'core/modal';
import ModalEvents from 'core/modal_events';
import Common from '../common';
const { component } = Common;

/**
 * Tracks event listeners for cleanup. Can auto-attach or just register.
 */
class ModalTracker extends Modal {
    /**
     * @param {HTMLElement} root
     */
    constructor(root) {
        super(root);
        /** @type {[Element, string, EventListener][]} */
        this._twhListeners = [];
    }

    destroy() {
        this._twhRemoveListeners();
        super.destroy();
    }

    /**
     * Add a listener and optionally attach it immediately.
     * @param {Element} el The DOM element
     * @param {string} event The event type
     * @param {EventListener} handler The listener function
     */
    twhRegisterListener(el, event, handler) {
        // Avoid duplicates
        if (!this._twhListeners.some(([e, ev, h]) => e === el && ev === event && h === handler)) {
            this._twhListeners.push([el, event, handler]);
            el.addEventListener(event, handler);
        }
    }

    /**
     * Add a listener by selector inside a container.
     * @param {Element} container The parent container
     * @param {string} selector CSS selector for target element
     * @param {string} event Event type
     * @param {EventListener} handler Listener function
     */
    twhRegisterListenerBySelector(container, selector, event, handler) {
        const el = container.querySelector(selector);
        if (el) {
            this.twhRegisterListener(el, event, handler);
        }
    }

    /** Remove all tracked listeners */
    _twhRemoveListeners() {
        this._twhListeners.forEach(([el, event, handler]) => el.removeEventListener(event, handler));
        this._twhListeners = [];
    }
}


class IBPickerModal extends ModalTracker {
    static TYPE = `${component}/picker_modal`;
    static TEMPLATE = `${component}/picker_modal`;

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}


class IBParamsModal extends ModalTracker {
    static TYPE = `${component}/params_modal`;
    static TEMPLATE = `${component}/params_modal`;

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}

class IBContextModal extends ModalTracker {
    static TYPE = `${component}/context_modal`;
    static TEMPLATE = `${component}/context_modal`;

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}

class IBPreviewModal extends ModalTracker {
    static TYPE = `${component}/preview_modal`;
    static TEMPLATE = `${component}/preview_modal`;

    registerEventListeners() {
        // Call the parent registration.
        super.registerEventListeners();
    }
}

// For Moodle < 4.3, Modal.create() did not exist yet so ModalFactory is used instead.
// ModalFactory resolves the class by type string via ModalRegistry, so both must be loaded.
// In Moodle 4.3+, cls.create() is called directly on the subclass — no registry needed.
/** @type {Promise<object|null>} */
const _modalFactoryPromise = (async () => {
    if (typeof Modal.create === 'function') {
        // Moodle 4.3+: direct subclass create(), neither ModalFactory nor ModalRegistry needed.
        return null;
    }
    // Moodle < 4.3: register modals so ModalFactory can look them up by type string.
    await import('core/modal_registry')
        .then(m => {
            const ModalRegistry = m.default ?? m;
            [IBPickerModal, IBParamsModal, IBContextModal, IBPreviewModal].forEach(cls => {
                ModalRegistry.register(cls.TYPE, cls, cls.TEMPLATE);
            });
        })
        .catch(() => { });
    const m = await import('core/modal_factory').catch(() => null);
    return m ? (m.default ?? m) : null;
})();

/**
 * @typedef {(el: Element, event: string, handler: EventListener) => void} ListenerTracker
 * @typedef {JQuery<HTMLElement> & {header: JQuery<HTMLElement>, body: JQuery<HTMLElement>, footer: JQuery<HTMLElement>, destroy: () => void, show: () => void, getRoot: () => {on: () => void}, twhRegisterListener: ListenerTracker, twhRegisterListenerBySelector: (container: string, selector: string, event: string, handler: EventListener) => void }} ModalDialogue
 */

/**
 * @typedef {{ destroyOnHidden: boolean | undefined}} ModalOpts
 */

export class ModalSrv {
    /**
     * @param {'picker' | 'params' | 'context' | 'preview'} name
     * @param {object} templateContext
     * @param {()=>void} [onHidden]
     * @returns {Promise<ModalDialogue>}
     */
    async create(name, templateContext, onHidden) {
        let cls;
        switch (name) {
            case ('picker'): cls = IBPickerModal; break;
            case ('params'): cls = IBParamsModal; break;
            case ('context'): cls = IBContextModal; break;
            case ('preview'): cls = IBPreviewModal; break;
        }
        const options = {
            type: cls.TYPE,
            templateContext,
            large: true,
        };
        let modal;
        if (cls.create) {
            // Moodle 4.3+: static create() handles template rendering and instantiation
            modal = await cls.create(options);
        } else {
            // Moodle < 4.3: legacy ModalFactory fallback
            const ModalFactory = await _modalFactoryPromise;
            // @ts-ignore
            modal = await ModalFactory.create(options);
        }
        // Override styles imposed by body.tox-fullscreen on modals
        modal.modal.css({
            'max-width': '800px',
            'height': 'initial'
        });
        modal.header.css({
            'height': '61.46px',
            'padding': '1rem 1rem'
        });
        if (onHidden) {
            // @ts-ignore
            modal.getRoot().on(ModalEvents.hidden, () => {
                onHidden();
            });
        }
        return modal;
    }
}

/** @type {ModalSrv | undefined} */
let instanceSrv;
/**
 * @returns {ModalSrv}
 */
export function getModalSrv() {
    if (!instanceSrv) {
        instanceSrv = new ModalSrv();
    }
    return instanceSrv;
}
