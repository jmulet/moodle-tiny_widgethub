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
 * Local WidgetHub plugin.
 *
 * @module      local_widgethub/widgettable
 * @copyright   2026 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import Notification from 'core/notification';
import { getExternalService } from './service/external_service';
import { hashCode } from './util';
import { fromJSON as json2yaml } from './libs/yaml-lazy';

/**
 * Update the footer of the table.
 * @param {HTMLTableElement} table - The table element.
 * @param {HTMLTableCellElement} tableFooterCell - The footer cell element.
 */
function updateFooter(table, tableFooterCell) {
    const nrows = table.querySelectorAll('tbody tr').length;
    tableFooterCell.innerHTML = `${nrows} widgets`;
}

export default {
    /**
     * Function to initialize the widget table.
     * @param {{
     *  tableId: string,
     *  selectAllId: string,
     *  deleteBtnId: string,
     *  confirmTitle: string,
     *  confirmMessage: string,
     *  confirmBtn: string,
     * }} params - Object with configuration parameters
     */
    init: function (params) {
        /** @type {HTMLTableElement | null} */
        // @ts-ignore
        const table = document.getElementById(params.tableId);
        /** @type {HTMLTableCellElement | null} */
        // @ts-ignore
        const tableFooterCell = table.querySelector('tfoot td');
        /** @type {HTMLInputElement | null} */
        // @ts-ignore
        const selectAll = document.getElementById(params.selectAllId);
        /** @type {HTMLButtonElement | null} */
        // @ts-ignore
        const deleteBtn = document.getElementById(params.deleteBtnId);
        /** @type {HTMLButtonElement | null} */
        // @ts-ignore
        const exportBtn = document.getElementById(params.exportBtnId);

        if (!table || !tableFooterCell || !selectAll || !deleteBtn || !exportBtn) {
            return;
        }

        // Add a footer to the table
        updateFooter(table, tableFooterCell);

        // Add colors to category badges
        /** @type {NodeListOf<HTMLTableRowElement>} */
        const badges = table.querySelectorAll('tbody tr td span.badge');
        badges.forEach(badge => {
            const catName = badge.innerText ?? 'misc';
            const color = hashCode(catName.toUpperCase()) % 360;
            let sat = '30%';
            if (catName.toLowerCase().startsWith('obsolet') || catName.toLowerCase().startsWith('deprecated')) {
                sat = '0%'; // Gray
            }
            badge.style.setProperty('background-color', `hsl(${color}, ${sat}, 40%)`, 'important');
            badge.style.setProperty('color', 'white');
        });

        document.querySelector('#admin-widgettable div.form-defaultinfo')?.classList?.add('d-none');

        /** @type {NodeListOf<HTMLTableCellElement>} */
        const headers = table.querySelectorAll('th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const columnIdxStr = header.getAttribute('data-sort');
                const tbody = table.querySelector('tbody');
                if (!tbody || !columnIdxStr) {
                    return;
                }
                const columnIdx = parseInt(columnIdxStr, 10);
                const rows = Array.from(tbody.querySelectorAll('tr'));

                // Determine direction.
                const isAsc = !header.classList.contains('asc');

                // Reset styles.
                headers.forEach(h => h.classList.remove('asc', 'desc'));
                header.classList.toggle('asc', isAsc);
                header.classList.toggle('desc', !isAsc);

                // Sorting.
                rows.sort((rowA, rowB) => {
                    const cellA = rowA.cells[columnIdx].innerText.trim();
                    const cellB = rowB.cells[columnIdx].innerText.trim();

                    // Detect if it's a number or text.
                    const aNum = parseFloat(cellA);
                    const bNum = parseFloat(cellB);

                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return isAsc ? aNum - bNum : bNum - aNum;
                    }

                    return isAsc
                        ? cellA.localeCompare(cellB)
                        : cellB.localeCompare(cellA);
                });

                // Redraw.
                rows.forEach(row => tbody.appendChild(row));
            });
        });

        // 2. SELECTION LOGIC (Checkboxes)
        const checkSelector = '.local_widgethub-check';

        // Function to update delete button state.
        const toggleDeleteBtn = () => {
            const count = table.querySelectorAll(checkSelector + ':checked').length;
            if (deleteBtn) {
                deleteBtn.disabled = (count === 0);
            }
        };

        // Event listener for "Select All"
        selectAll.addEventListener('change', (e) => {
            // 1. Convert target to HTMLInputElement explicitly
            /** @type {HTMLInputElement | null} */
            // @ts-ignore
            const target = (e.target);

            /** @type {NodeListOf<HTMLInputElement>} */
            const checkboxes = table.querySelectorAll(checkSelector);
            checkboxes.forEach(cb => {
                cb.checked = target?.checked ?? false;
            });
            toggleDeleteBtn();
        });

        // Individual events.
        table.addEventListener('change', (e) => {
            /** @type {HTMLInputElement | null} */
            // @ts-ignore
            const target = (e.target);

            // Verify that 'matches' exists for safety (in case the event comes from document or window)
            if (target?.matches && target.matches(checkSelector)) {
                toggleDeleteBtn();

                // If one is unchecked, uncheck the selectAll
                if (!target.checked && selectAll) {
                    selectAll.checked = false;
                }
            }
        });

        const locks = {
            visibilities: new Set(),
        };
        table.addEventListener('click', (e) => {
            /** @type {HTMLElement | null} */
            // @ts-ignore
            const target = e.target?.closest('i[data-visible]');
            if (target) {
                const isVisible = target.getAttribute('data-visible') === '1';
                const id = target.closest('tr')?.getAttribute('data-id');
                if (id) {
                    if (locks.visibilities.has(id)) {
                        return;
                    }
                    locks.visibilities.add(id);
                    const externalService = getExternalService();
                    externalService.setVisibility(parseInt(id), !isVisible).then((/** @type {boolean} */ success) => {
                        if (!success) {
                            console.error('Failed to update visibility');
                            return;
                        }
                        target.classList.toggle('fa-eye');
                        target.classList.toggle('fa-eye-slash');
                        target.classList.toggle('btn-warning');
                        target.setAttribute('data-visible', isVisible ? '0' : '1');
                        locks.visibilities.delete(id);
                    }).catch((err) => {
                        console.error('Failed to update visibility', err);
                        locks.visibilities.delete(id);
                    });
                }
            }
        });

        // 3. DELETION LOGIC (With Moodle confirmation)
        deleteBtn.addEventListener('click', () => {
            /** @type {NodeListOf<HTMLInputElement>} */
            const checked = table.querySelectorAll(checkSelector + ':checked');
            const ids = Array.from(checked).map(cb => parseInt(cb.value));

            if (ids.length === 0) {
                deleteBtn.disabled = true;
                return;
            }

            Notification.saveCancelPromise(
                params.confirmTitle,
                params.confirmMessage,
                params.confirmBtn,
            ).then(() => {
                const externalService = getExternalService();
                externalService.deleteWidgets(ids).then((/** @type {any} */ response) => {
                    selectAll.checked = false;
                    deleteBtn.disabled = true;
                    const deletedIds = response.ids;
                    deletedIds.forEach((/** @type {number} */ id) => {
                        const input = table.querySelector(`input[type="checkbox"][value="${id}"]`);
                        if (input) {
                            input.closest('tr')?.remove();
                        }
                    });
                    updateFooter(table, tableFooterCell);
                }).catch((/** @type {any} */ ex) => {
                    console.error(ex);
                });
            }).catch(() => {
                selectAll.checked = false;
                selectAll.dispatchEvent(new Event('change'));
                updateFooter(table, tableFooterCell);
            });
        });

        exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            console.log('Export button clicked');
            // Precheck if all documents include yml, if not generate from json.
            const externalService = getExternalService();
            const missingIds = await externalService.getWidgetsNoYml();
            if (missingIds.length > 0) {
                // TODO create batches.
                const documents = await externalService.getWidgetDocuments(missingIds, true, false);
                // Generate yml from json.
                const documentsWithYml = documents.map(doc => {
                    return {
                        yml: json2yaml(doc.json ?? ''),
                        id: doc.id,
                        key: doc.key
                    };
                });

                // Save missing yml documents.
                await externalService.saveWidgetsYml(documentsWithYml);
            }

            externalService.backupWidgets().then((/** @type {any} */ response) => {
                const draftAreaUrl = response.url;
                const a = document.createElement('a');
                a.href = draftAreaUrl;
                const now = new Date();
                const dateString =
                    now.getFullYear().toString() +
                    (now.getMonth() + 1).toString().padStart(2, '0') +
                    now.getDate().toString().padStart(2, '0') +
                    now.getHours().toString().padStart(2, '0') +
                    now.getMinutes().toString().padStart(2, '0') +
                    now.getSeconds().toString().padStart(2, '0');
                a.download = `tiny_widgethub_backup_${dateString}.whz`;
                a.click();
                exportBtn.disabled = false;
            }).catch((/** @type {any} */ ex) => {
                console.error(ex);
                exportBtn.disabled = false;
            });
        });
    }
};
