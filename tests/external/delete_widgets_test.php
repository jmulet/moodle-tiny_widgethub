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
// Polyfill for Moodle < 4.2.
if (!class_exists('\core_external\external_api')) {
    class_alias('\external_api', '\core_external\external_api');
}

global $CFG;
require_once($CFG->dirroot . '/webservice/tests/helpers.php');

use tiny_widgethub\local\storage\storagefactory;
use tiny_widgethub\external\delete_widgets;

/**
 * Unit tests for delete_widgets external function.
 *
 * @package     tiny_widgethub
 * @category    test
 * @copyright   2025 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers      \tiny_widgethub\external\delete_widgets
 */
final class delete_widgets_test extends \externallib_advanced_testcase {
    /**
     * Set up the test environment.
     */
    protected function setUp(): void {
        parent::setUp();
        storagefactory::reset_instance();
        $this->resetAfterTest(true);
    }

    public function test_execute_delete(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        // Create a widget directly via storage to delete.
        $widget = ['key' => 'wkd1', 'name' => 'Delete Me', 'template' => 'template', 'author' => 'Me', 'version' => '1.0'];
        $id = $storage->save_widget(null, $widget);

        $result = delete_widgets::execute([$id]);
        $result = \core_external\external_api::clean_returnvalue(delete_widgets::execute_returns(), $result);

        $this->assertCount(1, $result['ids']);
        $this->assertEquals($id, $result['ids'][0]);

        $this->assertFalse($storage->get_widget_by_id($id));
    }

    public function test_execute_permissions(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        delete_widgets::execute([1]);
    }
}
