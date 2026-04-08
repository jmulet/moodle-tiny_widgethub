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
 * @copyright   2025 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import { getExternalService } from './external_service';

export class FetchDocumentsBatch {
    static METHOD_NAME = 'tiny_widgethub_get_widget_documents';
    /**
     * @param {number} [delay] Time in ms to wait before flushing the queue.
     */
    constructor(delay = 500) {
        this.externalService = getExternalService();
        this.delay = delay;
        /** @type {Array<{ id: number, resolve: Function, reject: Function, promise: Promise<any> }>} */
        this.queue = [];
        this.timer = null;
    }

    /**
     * Add a call to the batch.
     * @param {number} id The widget id.
     * @returns {Promise<any>} A promise that resolves when this specific call completes.
     */
    fetchDocument(id) {
        // Check if the request is already pending in the queue
        const existing = this.queue.find(item => item.id === id);
        if (existing) {
            return existing.promise;
        }

        // Create the promise and store it along with resolve/reject
        /** @type {any} */
        const newEntry = { id };
        newEntry.promise = new Promise((resolve, reject) => {
            newEntry.resolve = resolve;
            newEntry.reject = reject;
        });

        this.queue.push(newEntry);

        // Handle the batch timer
        if (!this.timer) {
            this.timer = setTimeout(() => this._flush(), this.delay);
        }

        return newEntry.promise;
    }

    /**
     * Immediately sends all queued requests to the server.
     */
    _flush() {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = null;
        if (this.queue.length === 0) {
            return;
        }
        // Capture current batch and clear queue.
        const requests = [...this.queue];
        this.queue = [];
        const allIds = requests.map(item => item.id);

        this.externalService.getWidgetDocuments(allIds)
            .then((response) => {
                requests.forEach((item) => {
                    const doc = response
                        .find((/** @type {{id: number, json?: string, yml?: string}} */ e) => e.id === item.id)?.json;
                    if (!doc) {
                        item.reject(new Error('No document found for widget ' + item.id));
                        return;
                    }
                    item.resolve(doc);
                });
                return response;
            }).catch((/** @type {any} */ error) => {
                requests.forEach((item) => {
                    item.reject(error);
                });
            });
    }
}
