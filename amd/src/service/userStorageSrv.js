/* eslint-disable no-console */
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

export class UserStorageSrv {
   /**
    * @param {import('../options').EditorOptions} editorOptions
    * @param {import('../commands').IStorage} iStorage
    */
    constructor(editorOptions, iStorage) {
        /** @type {Storage} */
        this.localStorage = iStorage.localStorage;
        /** @type {Storage} */
        this.sessionStorage = iStorage.sessionStorage;
        /** @type {number} */
        this.userId = editorOptions.userId;
        /** @type {number} */
        this.courseId = editorOptions.courseId;
        /** @type {string} */
        this.STORE_KEY = "iedib-widgets_" + editorOptions.userId;
        /**
         * @type {Record<string, any>}
         */
        this._localStore = { values: {} };
        /**
         * @type {Record<string, any>}
         */
        this._sessionStore = { searchtext: '' };
        this.loadStore();
    }

    loadStore() {
        if (typeof this.localStorage !== 'undefined') {
            const json = this.localStorage.getItem(this.STORE_KEY);
            if (json) {
                try {
                    this._localStore = JSON.parse(json);
                } catch (ex) {
                    console.error(ex);
                }
            }
        }
        // Added storage for this _course
        // @ts-ignore
        if (!this._localStore["_" + this._courseId]) {
            // @ts-ignore
            this._localStore["_" + this._courseId] = {};
        }
        if (typeof this.sessionStorage !== 'undefined') {
            const json2 = this.sessionStorage.getItem(this.STORE_KEY);
            if (json2) {
                try {
                    this._sessionStore = JSON.parse(json2);
                } catch (ex) {
                    console.error(ex);
                }
            }
        }
    }

    /**
     * @template T
     * @param {string} key
     * @param {T} defaultValue
     * @returns {T}
     */
    getFromLocal(key, defaultValue) {
        if (!this._localStore) {
            return defaultValue;
        }
        // @ts-ignore
        const MLSC = this._localStore["_" + this._courseId]; // Almost everything goes here
        const MLS = this._localStore; // Only configuration params
        if (MLSC) {
            // @ts-ignore
            return MLSC[key] || MLS[key] || defaultValue;
        } else if (MLS) {
            // @ts-ignore
            return MLS[key] || defaultValue;
        }
        return defaultValue;
    }

    /**
     * @param {string} key
     * @param {*} defaultValue
     * @returns {*}
     */
    getFromSession(key, defaultValue) {
        return ((this._sessionStore[key] ?? null) !== null ? this._sessionStore[key] : defaultValue);
    }

    /**
     * @param {'local' | 'session' | undefined} [type]
     */
    saveStore(type) {
        if (type === 'local') {
            this.localStorage.setItem(this.STORE_KEY, JSON.stringify(this._localStore));
        } else if (type === 'session') {
            this.sessionStorage.setItem(this.STORE_KEY, JSON.stringify(this._sessionStore));
        } else if (type === null || type === undefined) {
            this.localStorage.setItem(this.STORE_KEY, JSON.stringify(this._localStore));
            this.sessionStorage.setItem(this.STORE_KEY, JSON.stringify(this._sessionStore));
        }
    }
    /**
     * @template T
     * @param {string} key
     * @param {T} value
     * @param {boolean=} persist
     * @returns {void}
     */
    setToLocal(key, value, persist) {
        // @ts-ignore
        const MLSC = this._localStore["_" + this._courseId]; // Almost everything goes here
        const MLS = this._localStore; // Only configuration params

        // @ts-ignore
        if (typeof (theValueMap) === 'object') {
            if (MLSC && key === 'saveall_data' || key === 'values') {
                MLSC[key] = MLSC[key] || {};
            } else {
                // @ts-ignore
                MLS[key] = MLS[key] || {};
            }
            // @ts-ignore
            const keys = Object.keys(value);
            for (let i = 0, len = keys.length; i < len; i++) {
                const theKey = keys[i];
                // @ts-ignore
                const val = value[theKey];
                if (MLSC && key === 'saveall_data' || key === 'values') {
                    MLSC[key][theKey] = val;
                } else {
                    // @ts-ignore
                    MLS[key][theKey] = val;
                }
            }
        } else {
            // @ts-ignore
            MLS[key] = value;
        }
        if (persist) {
            this.saveStore("local");
        }
    }
    /**
     * @template T
     * @param {string} key
     * @param {T} value
     * @param {boolean=} persist
     * @returns {void}
     */
    setToSession(key, value, persist) {
        if (typeof (value) === 'object') {
            // @ts-ignore
            this._sessionStore[key] = this._sessionStore[key] || {};
            // @ts-ignore
            const keys = Object.keys(value);
            for (let i = 0, len = keys.length; i < len; i++) {
                const theKey = keys[i];
                // @ts-ignore
                const val = value[theKey];
                // @ts-ignore
                this._sessionStore[key][theKey] = val;
            }
        } else {
            // @ts-ignore
            this._sessionStore[key] = value;
        }
        if (persist) {
            this.saveStore("session");
        }
    }
}