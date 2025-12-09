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
import Notification from 'core/notification';
import Ajax from 'core/ajax';
import { hashCode } from './util';

/**
 * Update the footer of the table.
 * @param {HTMLTableElement} table - The table element.
 * @param {HTMLTableCellElement} tableFooterCell - The footer cell element.
 */
const updateFooter = function (table, tableFooterCell) {
    const nrows = table.querySelectorAll('tbody tr').length;
    tableFooterCell.innerHTML = `${nrows} widgets`;
};

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
        /** @type {HTMLInputElement | null} */
        // @ts-ignore
        const selectAll = document.getElementById(params.selectAllId);
        /** @type {HTMLButtonElement | null} */
        // @ts-ignore
        const deleteBtn = document.getElementById(params.deleteBtnId);

        if (!table || !selectAll || !deleteBtn) {
            return;
        }

        // Add a footer to the table
        const tableFooter = document.createElement('tfoot');
        const tableFooterRow = document.createElement('tr');
        const tableFooterCell = document.createElement('td');
        tableFooterCell.classList.add('text-right', 'position-sticky', 'bottom-0', 'bg-light', 'z-index-1');
        tableFooterCell.colSpan = table.rows[0].cells.length;
        tableFooterRow.appendChild(tableFooterCell);
        tableFooter.appendChild(tableFooterRow);
        table.appendChild(tableFooter);
        updateFooter(table, tableFooterCell);

        // Add colors
        /** @type {NodeListOf<HTMLTableRowElement>} */
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const catName = row.cells[1].innerText ?? '';
            const color = hashCode(catName) % 360;
            let sat = '30%';
            if (catName.toLowerCase().startsWith('obsolet') || catName.toLowerCase().startsWith('deprecated')) {
                sat = '0%'; // Gray
            }
            row.style.backgroundColor = `hsl(${color}, ${sat}, 90%)`;
        });

        /** @type {HTMLElement | null} */
        const parent = table.parentElement;
        const isAlreadyWrapped = parent &&
            parent.classList.contains('table-responsive');
        if (!isAlreadyWrapped) {
            const tableContainer = document.createElement('div');
            tableContainer.classList.add('table-responsive');
            table.replaceWith(tableContainer);
            tableContainer.appendChild(table);
            tableContainer.style.maxHeight = '600px';
            tableContainer.style.overflowY = 'auto';
        } else {
            parent.style.maxHeight = '600px';
            parent.style.overflowY = 'auto';
        }

        document.querySelector('#admin-widgettable div.form-defaultinfo')?.classList?.add('d-none');
        /** @type {NodeListOf<HTMLTableCellElement>} */
        const allHeaders = table.querySelectorAll('thead th');
        allHeaders.forEach(header => {
            header.setAttribute('scope', 'col');
            header.classList.add('position-sticky', 'top-0', 'bg-light', 'z-index-1');
        });

        /** @type {NodeListOf<HTMLTableCellElement>} */
        const headers = table.querySelectorAll('th span[data-sort]');
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
        const checkSelector = '.tiny_widgethub-check';

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
                // @ts-ignore
                Ajax.call([{
                    methodname: 'tiny_widgethub_delete_widgets',
                    args: { ids }
                }])[0].then((/** @type {any} */ response) => {
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
    }
};
