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
 * Include all calls to core/ajax here.
 *
 * @module      tiny_widgethub/plugin
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
/** @ts-ignore */
import { call as fetchMany } from 'core/ajax';

export class ExternalService {
    static USER_PREFS_KEY = 'tiny_widgethub_userprefs';
    /**
     *
     * @param {string} serviceName
     * @param {object} args
     * @returns Promise<any>
     */
    _fetch(serviceName, args) {
        /** @ts-ignore */
        return fetchMany([{
            methodname: serviceName,
            args: args,
        }])[0];
    }
    /**
     *
     * @param {number[]} ids
     * @returns Promise<number[]>
     */
    deleteWidgets(ids) {
        return this._fetch('tiny_widgethub_delete_widgets', { ids });
    }
    /**
     * @param {{ id: number, yml: string, json: string }[]} widgets
     * @returns {Promise<{ids: number[]}>}
     */
    saveWidgets(widgets) {
        return this._fetch('tiny_widgethub_save_widgets', { widgets });
    }
    /**
     * @param {number[]} ids
     * @param {boolean} [includejson=true] Whether to include the json document in the response.
     * @param {boolean} [includeother=false] Whether to include the other documents in the response.
     * @returns {Promise<{id: number, key: string, json?: string, yml?: string}[]>}
     */
    getWidgetDocuments(ids, includejson = true, includeother = false) {
        return this._fetch('tiny_widgethub_get_widgetsdocuments', { ids, includejson, includeother });
    }

    /**
     *
     * @returns {Promise<string>} The backup file url.
     */
    backupWidgets() {
        return this._fetch('tiny_widgethub_get_backup', {});
    }

    /**
     * Retrieves the ids of the widgets without associated yml document.
     * @returns {Promise<number[]>}
     */
    getWidgetsNoYml() {
        return this._fetch('tiny_widgethub_get_widgetsnoyml', {});
    }

    /**
     * Save yml documents for widgets.
     * @param {{ id: number, key: string, yml: string }[]} widgetsdata
     * @returns {Promise<boolean[]>}
     */
    saveWidgetsYml(widgetsdata) {
        return this._fetch('tiny_widgethub_save_widgetsyml', { widgets: widgetsdata });
    }

    /**
     * @param {number} id
     * @param {boolean} visible
     * @returns {Promise<boolean>}
     */
    setVisibility(id, visible) {
        return this._fetch('tiny_widgethub_update_visible', { id, visible });
    }

    /**
     *
     * @param {string} userPrefs
     * @returns {Promise<boolean>}
     */
    async saveUserPref(userPrefs) {
        try {
            await this._fetch('core_user_update_user_preferences', {
                preferences: [
                    {
                        type: ExternalService.USER_PREFS_KEY,
                        value: userPrefs,
                    }
                ]
            });
            return true;
        } catch (e) {
            return false;
        }
    }
}


/**
 * @type {ExternalService | null}
 */
let instance = null;
/**
 * @returns {ExternalService}
 */
export function getExternalService() {
    if (!instance) {
        instance = new ExternalService();
    }
    return instance;
}