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

namespace tiny_widgethub\external;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/webservice/tests/helpers.php');

use tiny_widgethub\local\storage\storagefactory;
use tiny_widgethub\external\get_backup;

/**
 * Unit tests for get_backup external function.
 *
 * @package     tiny_widgethub
 * @category    test
 * @copyright   2025 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers      \tiny_widgethub\external\get_backup
 */
final class get_backup_test extends \externallib_advanced_testcase {
    protected function setUp(): void {
        global $DB;
        parent::setUp();
        storagefactory::reset_instance();
        $this->resetAfterTest(true);

        // Ensure the table is empty to pass test_initial_state.
        $DB->delete_records('files', ['component' => 'tiny_widgethub', 'filearea' => 'widgetdefs']);
    }

    public function test_execute_backup(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        // Create some data.
        $raw = [
            'key' => 'wkw1',
            'name' => 'name1',
            'template' => 'template1',
            'author' => 'A',
            'version' => '1',
        ];
        $yml = "key: w1\nauthor: A\nversion: 1\n";
        $id = $storage->save_widget(null, $raw, $yml);
        $this->assertGreaterThan(0, $id);
        // Assert that the document yml is not empty.
        $docs = $storage->get_documents_by_id([$id], true, true);
        $this->assertCount(1, $docs);
        $this->assertNotEmpty($docs[0]['json']);
        $this->assertNotEmpty($docs[0]['yml']);

        // Execute backup.
        $result = get_backup::execute();
        $result = \core_external\external_api::clean_returnvalue(get_backup::execute_returns(), $result);

        // Should return a URL.
        $this->assertNotEmpty($result['url']);
        $this->assertStringContainsString('.whz', $result['url']);
    }

    public function test_execute_permissions(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        get_backup::execute();
    }
}
