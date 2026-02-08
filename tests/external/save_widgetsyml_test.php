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
use tiny_widgethub\external\save_widgetsyml;

/**
 * Unit tests for save_widgetsyml external function.
 *
 * @package     tiny_widgethub
 * @category    test
 * @copyright   2025 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers      \tiny_widgethub\external\save_widgetsyml
 */
final class save_widgetsyml_test extends \externallib_advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        storagefactory::reset_instance();
        $this->resetAfterTest(true);
    }

    public function test_execute(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        $widget = ['key' => 'wkw1', 'author' => 'Me', 'version' => '1.0'];
        $id = $storage->save_widget(null, $widget, null); // No YML initially.
        // Test invalid widget (does not pass validation)
        $this->assertEquals(-1, $id);

        $widget['template'] = 'template';
        $widget['name'] = 'W1';
        $id = $storage->save_widget(null, $widget, null); // No YML initially.
        $this->assertGreaterThan(0, $id);
        $widgets = [
            [
                'id' => $id,
                'key' => 'wkw1',
                'yml' => 'New YML Content',
            ],
        ];

        $result = save_widgetsyml::execute($widgets);
        $result = \core_external\external_api::clean_returnvalue(save_widgetsyml::execute_returns(), $result);
        $this->assertCount(1, $result);
        $this->assertTrue($result[0]);

        // Verify storage.
        $docs = $storage->get_documents_by_id([$id], false, true);
        $this->assertCount(1, $docs);
        $this->assertEquals('New YML Content', $docs[0]['yml']);
    }

    public function test_execute_permissions(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        save_widgetsyml::execute([]);
    }
}
