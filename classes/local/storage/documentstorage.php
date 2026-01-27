<?php
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
 * Local WidgetHub document storage interface.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

/**
 * Document storage interface.
 */
interface documentstorage {
    /**
     * Get document.
     *
     * @param int $id Document id.
     * @param string $ext Document extension.
     * @return ?string Document content.
     */
    public function get(int $id, string $ext = 'json'): ?string;

    /**
     * Save document.
     *
     * @param int $id Document id.
     * @param string|null $doc Document content.
     * @param string $ext Document extension.
     * @return bool True if document was saved, false otherwise.
     */
    public function save(int $id, ?string $doc, string $ext = 'json'): bool;

    /**
     * Delete document.
     *
     * @param int $id Document id.
     * @param string $ext Document extension.
     * @return bool True if document was deleted, false otherwise.
     */
    public function delete(int $id, string $ext = 'json'): bool;

    /**
     * Delete all documents.
     *
     * @param int $id Document id.
     * @param bool $emptycache If true, it will empty the cache.
     */
    public function delete_all(int $id, bool $emptycache = true): void;
}
