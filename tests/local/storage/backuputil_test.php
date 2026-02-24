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
 * Unit tests for backuputil.
 *
 * @package    tiny_widgethub
 * @copyright  2026 Josep Mulet <pep.mulet@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

/**
 * Unit tests for backuputil.
 *
 * @group tiny_widgethub
 * @covers \tiny_widgethub\local\storage\backuputil
 */
final class backuputil_test extends \advanced_testcase {
    /**
     * Set up.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
        $this->setAdminUser();

        // Initial config.
        set_config('version', 2026010100, 'tiny_widgethub');
        set_config('cfg', 'Initial Config', 'tiny_widgethub');
        storagefactory::reset_instance();
    }

    /**
     * Test perform_backup.
     */
    public function test_perform_backup(): void {
        global $USER;

        $storage = new widgetstorageimpl();
        $widgetdata = [
            'key' => 'testwidget',
            'name' => 'Test Widget',
            'author' => 'Author',
            'version' => '1.0',
            'template' => '<div>test</div>',
        ];
        $storage->save_widget(null, $widgetdata, 'yml content');

        $partialsdata = ['key' => 'partials', 'p1' => 'v1'];
        $storage->save_widget(null, $partialsdata, 'partials yml content');

        $result = backuputil::perform_backup();

        $this->assertArrayHasKey('url', $result);
        $this->assertStringContainsString('draftfile.php', $result['url']);

        // Check the created zip content.
        // We need to find the file in the draft area.
        $fs = get_file_storage();
        // The URL contains the draftitemid and filename.
        // Parse the URL to get the draftitemid.
        $url = new \moodle_url($result['url']);
        $pathdata = explode('/', $url->get_path());
        // Path is something like /moodle/draftfile.php/5/user/draft/12345/tiny_widgethub_backup_12345.whz
        // In local developments it might be different. Let's use get_area_files.
        $context = \context_user::instance($USER->id);
        $files = $fs->get_area_files($context->id, 'user', 'draft', 0, 'id DESC', false);

        // We don't know the exact draftitemid returned by backuputil because it calls file_get_unused_draft_itemid().
        // But backuputil::perform_backup returns a URL that contains it.
        // Let's try to find it via the URL.
        $params = $url->params();
        $urlpath = $url->get_path();
        preg_match('|/([^/]+)/user/draft/(\d+)/|', $urlpath, $matches);
        $draftitemid = (int)$matches[2];

        $files = $fs->get_area_files($context->id, 'user', 'draft', $draftitemid, 'id DESC', false);
        $this->assertCount(1, $files);
        $file = reset($files);
        $this->assertStringStartsWith('tiny_widgethub_backup_', $file->get_filename());
        $this->assertStringEndsWith('.whz', $file->get_filename());

        // Extract and check.
        $tempdir = make_temp_directory('test_backuputil');
        $tempzip = $tempdir . '/test.zip';
        $file->copy_content_to($tempzip);

        $zip = new \ZipArchive();
        $this->assertTrue($zip->open($tempzip));

        $this->assertNotFalse($zip->getFromName('manifest.json'));
        $manifest = json_decode($zip->getFromName('manifest.json'), true);
        $this->assertEquals('tiny_widgethub', $manifest['plugin']);
        $this->assertEquals(2026010100, $manifest['version']);

        $this->assertNotFalse($zip->getFromName('testwidget.json'));
        $this->assertNotFalse($zip->getFromName('testwidget.yml'));

        $this->assertNotFalse($zip->getFromName('partials.json'));
        $this->assertNotFalse($zip->getFromName('partials.yml'));
        $this->assertNotFalse($zip->getFromName('cfg.txt'));
        $this->assertEquals('Initial Config', $zip->getFromName('cfg.txt'));

        $zip->close();
        fulldelete($tempdir);
    }

    /**
     * Test restore_backup.
     */
    public function test_restore_backup(): void {
        global $USER;

        $fs = get_file_storage();
        $context = \context_user::instance($USER->id);
        $draftitemid = file_get_unused_draft_itemid();

        // Create a zip manually.
        $tempdir = make_temp_directory('test_restore');
        $tempzip = $tempdir . '/restore.whz';
        $zip = new \ZipArchive();
        $zip->open($tempzip, \ZipArchive::CREATE);

        $manifest = [
            'plugin' => 'tiny_widgethub',
            'version' => 2026010100,
        ];
        $zip->addFromString('manifest.json', json_encode($manifest));
        $zip->addFromString('cfg.txt', 'Restored Config');

        $widgetdata = [
            'key' => 'restoredwidget',
            'name' => 'Restored Widget',
            'author' => 'Restored Author',
            'version' => '2.0',
            'template' => '<div>restored</div>',
        ];
        $zip->addFromString('restoredwidget.json', json_encode($widgetdata));
        $zip->addFromString('restoredwidget.yml', 'restored yml');

        $partials = ['key' => 'partials', 'r1' => 'rv1'];
        $zip->addFromString('partials.json', json_encode($partials));

        $zip->close();

        // Clear stat cache and check if file is truly ready.
        clearstatcache(true, $tempzip);
        if (!is_readable($tempzip)) {
            $this->fail("Temporary zip file was not created or is not readable.");
        }

        // Save to draft area.
        $filerecord = [
            'contextid' => $context->id,
            'component' => 'user',
            'filearea' => 'draft',
            'itemid' => $draftitemid,
            'filepath' => '/',
            'filename' => 'restore.whz',
            'userid' => $USER->id,
        ];
        $storedfile = $fs->create_file_from_pathname($filerecord, $tempzip);
        $this->assertNotEmpty($storedfile);

        $data = new \stdClass();
        $data->zipfile = $draftitemid;
        $data->override = 1;
        $data->config = 1;

        $result = backuputil::restore_backup($data);

        $this->assertTrue($result['success']);

        // Verify config.
        $this->assertEquals('Restored Config', get_config('tiny_widgethub', 'cfg'));

        // Verify widget.
        $storage = new widgetstorageimpl();
        $widget = $storage->get_widget_by_key('restoredwidget');
        $this->assertNotFalse($widget);
        $this->assertEquals('Restored Widget', $widget->name);

        $docs = $storage->get_documents_by_id([$widget->id], true, true);
        $this->assertEquals('restored yml', $docs[0]['yml']);

        // Verify partials.
        $restoredpartials = $storage->get_partials();
        $this->assertArrayHasKey('r1', $restoredpartials);
        $this->assertEquals('rv1', $restoredpartials['r1']);

        fulldelete($tempdir);
    }

    /**
     * Test restore_backup with invalid manifest.
     */
    public function test_restore_backup_invalid_manifest(): void {
        global $USER;

        $fs = get_file_storage();
        $context = \context_user::instance($USER->id);
        $draftitemid = file_get_unused_draft_itemid();

        $tempdir = make_temp_directory('test_restore_invalid');
        $tempzip = $tempdir . '/invalid.whz';
        $zip = new \ZipArchive();
        $zip->open($tempzip, \ZipArchive::CREATE);
        // No manifest.json or wrong content.
        $zip->addFromString('something.txt', 'hello');
        $zip->close();

        $filerecord = [
            'contextid' => $context->id,
            'component' => 'user',
            'filearea' => 'draft',
            'itemid' => $draftitemid,
            'filepath' => '/',
            'filename' => 'invalid.whz',
        ];
        $fs->create_file_from_pathname($filerecord, $tempzip);

        $data = new \stdClass();
        $data->zipfile = $draftitemid;
        $data->override = 1;
        $data->config = 1;

        $result = backuputil::restore_backup($data);

        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid backup file. No manifest found.', $result['logs'][0]['message']);

        fulldelete($tempdir);
    }

    /**
     * Test restore_backup with lower version.
     */
    public function test_restore_backup_version_mismatch(): void {
        global $USER;

        $fs = get_file_storage();
        $context = \context_user::instance($USER->id);
        $draftitemid = file_get_unused_draft_itemid();

        $tempdir = make_temp_directory('test_restore_version');
        $tempzip = $tempdir . '/lowversion.whz';
        $zip = new \ZipArchive();
        $zip->open($tempzip, \ZipArchive::CREATE);

        $manifest = [
            'plugin' => 'tiny_widgethub',
            'version' => 2027010100, // Higher than 2026010100 set in setUp.
        ];
        $zip->addFromString('manifest.json', json_encode($manifest));
        $zip->close();

        $filerecord = [
            'contextid' => $context->id,
            'component' => 'user',
            'filearea' => 'draft',
            'itemid' => $draftitemid,
            'filepath' => '/',
            'filename' => 'lowversion.whz',
        ];
        $fs->create_file_from_pathname($filerecord, $tempzip);

        $data = new \stdClass();
        $data->zipfile = $draftitemid;
        $data->override = 1;
        $data->config = 1;

        $result = backuputil::restore_backup($data);

        $this->assertFalse($result['success']);
        $this->assertEquals('Backup version is higher than the plugin version.', $result['logs'][0]['message']);

        fulldelete($tempdir);
    }
}
