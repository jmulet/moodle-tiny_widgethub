/**
 * Sync page logic for Tiny WidgetHub.
 *
 * @module      tiny_widgethub/settingssync
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export default {
    /**
     * Initialize the synchronization table logic.
     */
    init: () => {
        const table = /** @type {HTMLTableElement | null} */ (document.getElementById('syncstatustable'));
        /** @type {HTMLInputElement | null} */
        const selectAll = document.querySelector('#selectallsync');
        /** @type {HTMLInputElement | null} */
        const showInstalledOnly = document.querySelector('#showinstalledonlysync');
        /** @type {HTMLButtonElement | null} */
        const submitBtn = document.querySelector('[name="submitbutton"]');
        /** @type {HTMLInputElement | null} */
        const selectedKeysInput = document.querySelector('[name="selectedkeys"]');

        if (!table || !selectAll || !submitBtn || !selectedKeysInput) {
            return;
        }

        /** @returns {NodeListOf<HTMLInputElement>} */
        const getChecks = () => table.querySelectorAll('.synccheck');

        /**
         * Collect checked widget keys from visible rows and store as JSON in the hidden field.
         */
        const syncHiddenField = () => {
            const keys = Array.from(getChecks())
                .filter(check => check.checked)
                .map(check => check.value);
            selectedKeysInput.value = JSON.stringify(keys);
        };

        /**
         * Enable submit only when at least one visible checkbox is checked.
         */
        const updateSubmitButton = () => {
            const anyChecked = Array.from(getChecks()).some(check => check.checked);
            submitBtn.disabled = !anyChecked;
        };

        // --- SORTING ---

        /** @type {NodeListOf<HTMLTableCellElement>} */
        const headers = table.querySelectorAll('th[data-sort]');

        /**
         * Sort the table by a given column index and direction.
         * @param {number} columnIdx
         * @param {boolean} asc
         */
        const sortTable = (columnIdx, asc) => {
            const tbody = table.querySelector('tbody');
            if (!tbody) {
                return;
            }
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const mapped = rows.map(row => ({
                row,
                value: row.cells[columnIdx]?.textContent?.trim() ?? ''
            }));
            mapped.sort((a, b) => {
                const aNum = parseFloat(a.value);
                const bNum = parseFloat(b.value);
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return asc ? aNum - bNum : bNum - aNum;
                }
                return asc ? a.value.localeCompare(b.value) : b.value.localeCompare(a.value);
            });
            mapped.forEach(({row}) => tbody.appendChild(row));
        };

        headers.forEach(header => {
            header.addEventListener('click', () => {
                const columnIdxStr = header.getAttribute('data-sort');
                if (!columnIdxStr) {
                    return;
                }
                const isAsc = !header.classList.contains('asc');
                headers.forEach(h => h.classList.remove('asc', 'desc'));
                header.classList.toggle('asc', isAsc);
                header.classList.toggle('desc', !isAsc);
                sortTable(parseInt(columnIdxStr, 10), isAsc);
            });
        });

        // Default: sort by name (column 2) ascending.
        const nameHeader = table.querySelector('th[data-sort="2"]');
        if (nameHeader) {
            nameHeader.classList.add('asc');
        }
        sortTable(2, true);

        // --- FILTER: show installed only ---

        if (showInstalledOnly) {
            showInstalledOnly.addEventListener('change', () => {
                const hideNew = showInstalledOnly.checked;
                const tbody = table.querySelector('tbody');
                if (!tbody) {
                    return;
                }
                tbody.querySelectorAll('tr[data-status="statusnew"]').forEach(row => {
                    /** @type {HTMLTableRowElement} */ (row).style.display = hideNew ? 'none' : '';
                    // Uncheck any checked checkboxes in hidden rows.
                    if (hideNew) {
                        row.querySelectorAll('.synccheck').forEach(cb => {
                            /** @type {HTMLInputElement} */ (cb).checked = false;
                        });
                    }
                });
                // Keep select-all consistent.
                const checks = Array.from(getChecks());
                const visibleChecks = checks.filter(cb => cb.closest('tr')?.style.display !== 'none');
                selectAll.checked = visibleChecks.length > 0 && visibleChecks.every(cb => cb.checked);
                syncHiddenField();
                updateSubmitButton();
            });
        }

        // --- SELECT ALL ---

        if (getChecks().length === 0) {
            selectAll.disabled = true;
            selectAll.style.visibility = 'hidden';
        }

        selectAll.addEventListener('change', () => {
            const hideNew = showInstalledOnly?.checked ?? false;
            getChecks().forEach(check => {
                const row = check.closest('tr');
                if (!check.disabled && !(hideNew && row?.getAttribute('data-status') === 'statusnew')) {
                    check.checked = selectAll.checked;
                }
            });
            syncHiddenField();
            updateSubmitButton();
        });

        // --- INDIVIDUAL CHECKBOXES ---

        table.addEventListener('change', (e) => {
            /** @type {HTMLInputElement | null} */
            // @ts-ignore
            const target = e.target;
            if (!target?.matches('.synccheck')) {
                return;
            }
            const checks = Array.from(getChecks());
            const visibleChecks = checks.filter(cb => cb.closest('tr')?.style.display !== 'none');
            selectAll.checked = visibleChecks.length > 0 && visibleChecks.every(cb => cb.checked);
            syncHiddenField();
            updateSubmitButton();
        });

        // Initial state: apply filter and update button.
        showInstalledOnly?.dispatchEvent(new Event('change'));
        updateSubmitButton();
    }
};
