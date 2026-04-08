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
 * Local WidgetHub backup utility.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

use stdClass;

/**
 * Class backuputil
 *
 * Utility class for backup operations.
 */
class backuputil {
    /**
     * Perform a backup.
     *
     * @return array The download url of the backup.
     */
    public static function perform_backup(): array {
        global $USER;
        // Get the document from the storage.
        $storage = storagefactory::get_instance();

        // Get all documents from the storage including json, yml, js and css.
        $documents = $storage->get_documents_by_id(null, true, true);

        // Create a zip.
        $zipfiles = [];
        // Must include a manifest file.
        $manifest = [
            'plugin' => 'tiny_widgethub',
            'version' => get_config('tiny_widgethub', 'version'),
        ];
        $zipfiles['manifest.json'] = [json_encode($manifest)];

        foreach ($documents as $document) {
            $key = $document['key'];
            $filename = trim($key);
            $zipfiles[$filename . '.json'] = [$document['json']];
            if (($document['yml'] ?? null) !== null) {
                $zipfiles[$filename . '.yml'] = [$document['yml']];
            }
            if (($document['html'] ?? null) !== null) {
                $zipfiles[$filename . '.html'] = [$document['html']];
            }
            if (($document['css'] ?? null) !== null) {
                $zipfiles[$filename . '.css'] = [$document['css']];
            }
        }
        // Add partials (json and yml).
        $partials = $storage->get_partials();
        if (($partials ?? null) !== null) {
            $zipfiles['partials.json'] = [json_encode($partials)];
        }
        $partials = $storage->get_partials_yml();
        if (($partials ?? null) !== null) {
            $zipfiles['partials.yml'] = [$partials];
        }
        // Include configuration data as cfg.txt.
        $configdata = get_config('tiny_widgethub', 'cfg');
        if (!empty($configdata)) {
            $zipfiles['cfg.txt'] = [$configdata];
        }
        // Include config from additionalcss.
        $additionalcss = get_config('tiny_widgethub', 'additionalcss');
        if (!empty($additionalcss)) {
            $zipfiles['additionalcss.txt'] = [$additionalcss];
        }
        $filename = 'tiny_widgethub_backup_' . time() . '.whz';
        $context = \context_user::instance($USER->id);

        $draftitemid = file_get_unused_draft_itemid();
        // Create the archive.
        $packer = get_file_packer('application/zip');
        $packer->archive_to_storage(
            $zipfiles,
            $context->id,
            'user',
            'draft',
            $draftitemid,
            '/',
            $filename,
            $USER->id
        );

        // Generate the URL (force download by setting second param of out to false).
        $downloadurl = \moodle_url::make_draftfile_url($draftitemid, '/', $filename)->out(false);

        return ['url' => $downloadurl];
    }

    /**
     * Make a log entry.
     *
     * @param bool $success The success status.
     * @param string $message The message.
     * @param string $severity The severity.
     * @return array The log entry.
     */
    private static function make_log(bool $success, string $message, string $severity = ''): array {
        return [
            'success' => $success,
            'logs' => [
                [
                    'message' => $message,
                    'severity' => $severity,
                ],
            ],
        ];
    }

    /**
     * Restore a backup.
     *
     * @param stdClass $data The form data. (zipfile, override, config)
     * @return array The result of the restore. (success, logs: [{message, severity}])
     */
    public static function restore_backup(stdClass $data): array {
        global $USER;
        $draftitemid = $data->zipfile;
        $overrideenabled = $data->override === 1;
        $configenabled = $data->config === 1;

        // Draft files are always in the 'user' component and 'draft' filearea.
        $fs = get_file_storage();
        $context = \context_user::instance($USER->id);
        $files = $fs->get_area_files(
            $context->id, // Files belong to the current user.
            'user', // Component is 'user'.
            'draft', // Area is 'draft'.
            $draftitemid, // The ID from the form.
            'id DESC', // Sort order.
            false // Don't include directories.
        );

        if (empty($files)) {
            return self::make_log(false, 'No files found in the draft area.', 'error');
        }
        $file = reset($files); // Get the first file.
        $tempdir = make_temp_directory('tiny_widgethub_backup');
        $tempzip = $tempdir . '/b' . $file->get_contenthash();
        $file->copy_content_to($tempzip);
        // Unzip the file.
        $zip = new \ZipArchive();
        try {
            if (!$zip->open($tempzip)) {
                throw new \Exception('Invalid backup file.');
            }

            // Validate manifest.json.
            $manifest = $zip->getFromName('manifest.json');
            if (empty($manifest)) {
                throw new \Exception('Invalid backup file. No manifest found.');
            }
            $manifest = json_decode($manifest, true);
            if (empty($manifest) || ($manifest['plugin'] ?? '') !== 'tiny_widgethub') {
                throw new \Exception('Invalid manifest found in the backup.');
            }
            $currentversion = get_config('tiny_widgethub', 'version');
            if ($manifest['version'] > $currentversion) {
                throw new \Exception('Backup version is higher than the plugin version.');
            }
        } catch (\Exception $e) {
            $fs->delete_area_files($context->id, 'user', 'draft', $draftitemid);
            fulldelete($tempdir);
            return self::make_log(false, $e->getMessage(), 'error');
        }

        $logs = [];

        // List all files in the zip.
        $storage = storagefactory::get_instance();
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $filename = $zip->getNameIndex($i);
            if (str_contains($filename, '/') || str_contains($filename, '\\') || str_contains($filename, '..')) {
                $logs[] = [
                    'message' => "File skipped due to security or invalid structure: $filename",
                    'severity' => 'warning',
                ];
                continue;
            }
            $ext = pathinfo($filename, PATHINFO_EXTENSION);
            $name = pathinfo($filename, PATHINFO_FILENAME);
            if ($filename === 'manifest.json') {
                continue;
            } else if ($filename === 'cfg.txt' && $configenabled) {
                $logs[] = ['message' => 'Restoring ' . $filename];
                $cfgdata = fix_utf8($zip->getFromName($filename));
                set_config('cfg', $cfgdata, 'tiny_widgethub');
            } else if ($filename === 'additionalcss.txt' && $configenabled) {
                $logs[] = ['message' => 'Restoring ' . $filename];
                $additionalcss = fix_utf8($zip->getFromName($filename));
                set_config('additionalcss', $additionalcss, 'tiny_widgethub');
            } else if ($ext === 'json') {
                $jsondata = fix_utf8($zip->getFromName($filename));
                $jsondata = json_decode($jsondata);
                if (!is_object($jsondata) || empty($jsondata) || !isset($jsondata->key)) {
                    $logs[] = [
                        'message' => 'Invalid JSON data in ' . $filename,
                        'severity' => 'error',
                    ];
                    continue;
                }
                $jsondata = (array) $jsondata;
                if ($jsondata['key'] === 'partials') {
                    $localpartials = $storage->get_partials();
                    $zippartials = array_merge($localpartials, $jsondata);
                    $res = $storage->save_widget(storagefactory::PARTIALS_ID, $zippartials);
                    $logs[] = [
                        'message' => 'Restoring ' . $filename,
                        'severity' => $res ? '' : 'error',
                    ];
                    continue;
                }
                $found = $storage->get_widget_by_key($jsondata['key'], 'id');
                if (!$overrideenabled && $found) {
                    $logs[] = [
                        'message' => 'Skip ' . $filename . '. Widget ' . $jsondata['key'] . ' already exists.',
                        'severity' => 'warning',
                    ];
                    continue;
                }
                $yml = $zip->getFromName($name . '.yml') ?? null;
                $foundid = $found ? $found->id : null;
                $res = $storage->save_widget($foundid, $jsondata, $yml);
                $logs[] = [
                    'message' => 'Restoring ' . $filename,
                    'severity' => $res ? '' : 'error',
                ];
            }
        }

        $zip->close();
        // Remove the draft file.
        $fs->delete_area_files($context->id, 'user', 'draft', $draftitemid);
        fulldelete($tempdir);

        return [
            'success' => true,
            'logs' => $logs,
        ];
    }
}
