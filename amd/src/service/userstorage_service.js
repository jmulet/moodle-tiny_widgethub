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

import { getEditorOptions, getUserPrefs } from '../options';
import Common from '../common';
import { getExternalService } from './external_service';
const { component } = Common;

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @typedef {{
 *     getItem: () => string | null,
 *     setItem: (value: string) => void
 * }} MyStorage;
 * @typedef {{localStorage: Storage, sessionStorage: Storage, moodleStorage: MyStorage}} IStorage;
 */

const MOODLE_STORAGE_KEYS = ['viewmode', 'startup.filters'];

export class UserStorageSrv {
    /**
     * @param {import('../options').EditorOptions} editorOptions
     * @param {IStorage} iStorage
     */
    constructor(editorOptions, iStorage) {
        /** @type {Storage} */
        this.localStorage = iStorage.localStorage;
        /** @type {Storage} */
        this.sessionStorage = iStorage.sessionStorage;
        /** @type {MyStorage} */
        this.moodleStorage = iStorage.moodleStorage;
        /** @type {number} */
        this._courseId = editorOptions.courseId;
        /** @type {string} */
        this.STORE_KEY = `${component}_${editorOptions.userInfo.id}`;
        /**
         * @type {Record<string, any>}
         */
        this._localStore = Object.assign(Object.create(null), { values: Object.create(null) });
        /**
         * @type {Record<string, any>}
         */
        this._moodleStore = Object.create(null);
        /**
         * @type {Record<string, any>}
         */
        this._sessionStore = Object.assign(Object.create(null), { searchtext: '' });
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
        if (typeof this.moodleStorage !== 'undefined') {
            const json2 = this.moodleStorage.getItem();
            if (json2) {
                try {
                    this._moodleStore = JSON.parse(json2);
                } catch (ex) {
                    console.error(ex);
                }
            }
        }
        if (typeof this.sessionStorage !== 'undefined') {
            const json3 = this.sessionStorage.getItem(this.STORE_KEY);
            if (json3) {
                try {
                    this._sessionStore = JSON.parse(json3);
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
        // Try to find first in moodleStorage
        if (this._moodleStore[key]) {
            return this._moodleStore[key];
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
            // Some local keys go to moodleStorage
            const data = Object.fromEntries(
                MOODLE_STORAGE_KEYS
                    .filter(key => this._localStore[key] !== undefined)
                    .map(key => [key, this._localStore[key]])
            );

            if (Object.keys(data).length > 0) {
                this.moodleStorage.setItem(JSON.stringify(data));
            }
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
        if (typeof (value) === 'object') {
            if (MLSC && (key === 'saveall_data' || key === 'values')) {
                MLSC[key] = MLSC[key] || Object.create(null);
            } else {
                // @ts-ignore
                MLS[key] = MLS[key] || Object.create(null);
            }
            // @ts-ignore
            const keys = Object.keys(value);
            for (let i = 0, len = keys.length; i < len; i++) {
                const theKey = keys[i];
                if (theKey === '__proto__' || theKey === 'constructor' || theKey === 'prototype') {
                    continue;
                }
                // @ts-ignore
                const val = value[theKey];
                if (MLSC && (key === 'saveall_data' || key === 'values')) {
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
            this._sessionStore[key] = this._sessionStore[key] || Object.create(null);
            // @ts-ignore
            const keys = Object.keys(value);
            for (let i = 0, len = keys.length; i < len; i++) {
                const theKey = keys[i];
                if (theKey === '__proto__' || theKey === 'constructor' || theKey === 'prototype') {
                    continue;
                }
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

    /**
     * @returns {{key: string, p: Record<string, any>}[]}
     */
    getRecentUsed() {
        let recentList = [];
        try {
            recentList = JSON.parse(this.getFromSession("recent", "[]"));
        } catch (ex) {
            console.error('Cannot parse recent', ex);
        }
        return recentList;
    }
}


const userStorageInstances = new Map();
/**
 * @param {import('../plugin').TinyMCE} editor
 * @returns {UserStorageSrv}
 */
export function getUserStorage(editor) {
    let instance = userStorageInstances.get(editor);
    if (!instance) {
        const userPrefs = getUserPrefs(editor);
        /** @type {MyStorage} */
        const moodleStorage = {
            getItem: () => {
                return userPrefs;
            },
            setItem: (value) => {
                const externalService = getExternalService();
                externalService.saveUserPref(value)
                    .catch((/** @type {Error} */ ex) => {
                        console.error('Cannot save user prefs', ex);
                    });
            }
        };
        /** @type {IStorage} */
        const iStorage = {
            localStorage,
            sessionStorage,
            moodleStorage
        };
        instance = new UserStorageSrv(getEditorOptions(editor), iStorage);
        userStorageInstances.set(editor, instance);
    }
    return instance;
}
