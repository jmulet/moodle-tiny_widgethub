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
use tiny_widgethub\external\get_widgetsnoyml;

/**
 * Unit tests for get_widgetsnoyml external function.
 *
 * @package     tiny_widgethub
 * @category    test
 * @copyright   2025 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers      \tiny_widgethub\external\get_widgetsnoyml
 */
final class get_widgetsnoyml_test extends \externallib_advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        storagefactory::reset_instance();
        $this->resetAfterTest(true);
    }

    public function test_execute(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        // Create a widget with YML.
        $idyesyml = $storage->save_widget(null, [
            'key' => 'yes_yml',
            'name' => 'Unnamed Widget',
            'template' => 'template1',
            'author' => 'Me',
            'version' => '1.0',
        ], 'some: yml');

        // Create a widget without YML.
        $widget = ['key' => 'no_yml', 'name' => 'name1', 'template' => 'template1', 'author' => 'Me', 'version' => '1.0'];
        $idnoyml = $storage->save_widget(null, $widget, null);

        $result = get_widgetsnoyml::execute();
        $result = \core_external\external_api::clean_returnvalue(get_widgetsnoyml::execute_returns(), $result);

        // Result is a list of IDs.
        $this->assertContains($idnoyml, $result);
        $this->assertNotContains($idyesyml, $result);
    }
}
