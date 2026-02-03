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
 * Local WidgetHub DB storage implementation.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

/**
 * Class documentstorageimpl
 *
 * File storage implementation used to manage local widget documents: json, yml, js and css.
 */
class documentstorageimpl implements documentstorage {
    /**
     * Component name.
     */
    private const COMPONENT_NAME = 'tiny_widgethub';
    /**
     * File area for widget definitions.
     */
    private const FILEAREA = 'widgetdefs';
    /**
     * Valid document types.
     */
    private const VALID_DOCUMENT_TYPES = ['json', 'slim.json', 'yml'];

    /**
     * Load filearea file.
     *
     * @param int $id Document id.
     * @param string $ext Document extension.
     * @return ?string Document content.
     */
    private static function load_filearea_document($id, $ext): ?string {
        $systemcontextid = \context_system::instance()->id;
        $fs = get_file_storage();
        $file = $fs->get_file(
            $systemcontextid,
            self::COMPONENT_NAME,
            self::FILEAREA,
            $id,
            '/',
            'data.' . $ext
        );
        if ($file) {
            try {
                $content = $file->get_content();
            } catch (\Exception $e) {
                debugging('Document ' . $ext . ' with ID ' . $id . ' was missing from disk.', DEBUG_DEVELOPER);
                return null;
            }
            return $content;
        }
        return null;
    }

    /**
     * Save filearea file.
     *
     * @param int $id Document id.
     * @param string|array|null $doc Document content. Null deletes document
     * @param string $ext Document extension.
     * @return bool True if document was saved, false otherwise.
     */
    private static function save_filearea_document(int $id, $doc, string $ext): bool {
        if ($id < 0) {
            throw new \moodle_exception('invalid id ' . $id, 'tiny_widgethub');
        }
        $systemcontextid = \context_system::instance()->id;
        $fs = get_file_storage();
        $fileinfo = [
            'contextid' => $systemcontextid,
            'component' => self::COMPONENT_NAME,
            'filearea' => self::FILEAREA,
            'itemid' => $id,
            'filepath' => '/',
            'filename' => 'data.' . $ext,
        ];
        if ($doc !== null && is_array($doc) && $ext === 'json') {
            $fileinfo['author'] = \core_text::substr($doc['author'] ?? '', 0, 255);
            $fileinfo['license'] = \core_text::substr($doc['version'] ?? '', 0, 255);
            $source = [
                'id' => $doc['id'] ?? '',
                'key' => $doc['key'] ?? $doc['id'] ?? '',
                'name' => $doc['name'] ?? $doc['key'] ?? '',
                'c' => $doc['category'] ?? 'other',
                'h' => ($doc['hidden'] ?? false) ? 1 : 0,
            ];
            $fileinfo['source'] = json_encode($source);
            $doc = json_encode($doc);
        }
        $file = $fs->get_file(
            $fileinfo['contextid'],
            $fileinfo['component'],
            $fileinfo['filearea'],
            $fileinfo['itemid'],
            $fileinfo['filepath'],
            $fileinfo['filename']
        );
        if ($file) {
            if ($doc !== null && $file->compare_to_string($doc)) {
                // Absolutely nothing changed.
                return true;
            }
            $file->delete();
        }
        if ($doc === null) {
            return true;
        }
        $file = $fs->create_file_from_string($fileinfo, $doc);
        if (!$file) {
            return false;
        }
        return true;
    }

    /**
     * Get document.
     *
     * @param int $id Document id.
     * @param string $ext Document extension.
     * @return ?string Document content.
     */
    public function get(int $id, string $ext = 'json'): ?string {
        return self::load_filearea_document($id, $ext);
    }

    /**
     * Save document.
     *
     * @param int $id Document id.
     * @param string|array|null $doc Document content.
     * @param string $ext Document extension.
     * @return bool True if document was saved, false otherwise.
     */
    public function save(int $id, $doc, string $ext = 'json'): bool {
        $result = self::save_filearea_document($id, $doc, $ext);
        if ($result && $ext === 'json') {
            \cache::make('tiny_widgethub', 'index')->delete('geteditordata');
        }
        return $result;
    }

    /**
     * Delete document.
     *
     * @param int $id Document id.
     * @param string $ext Document extension.
     * @return bool True if document was deleted, false otherwise.
     */
    public function delete(int $id, string $ext = 'json'): bool {
        $result = self::save_filearea_document($id, null, $ext);
        if ($result && $ext === 'json') {
            \cache::make('tiny_widgethub', 'index')->delete('geteditordata');
        }
        return $result;
    }

    /**
     * Delete all documents associated to a widget id.
     *
     * @param int $id Widget id.
     * @param bool $emptycache If true, it will empty the cache.
     */
    public function delete_all(int $id, bool $emptycache = true): void {
        foreach (self::VALID_DOCUMENT_TYPES as $ext) {
            self::save_filearea_document($id, null, $ext);
        }
        if ($emptycache) {
            \cache::make('tiny_widgethub', 'index')->delete('geteditordata');
        }
    }
}
