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
use tiny_widgethub\external\get_widgetsdocuments;

/**
 * Unit tests for get_widgetsdocuments external function.
 *
 * @package     tiny_widgethub
 * @category    test
 * @copyright   2025 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers      \tiny_widgethub\external\get_widgetsdocuments
 */
final class get_widgetsdocuments_test extends \externallib_advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        storagefactory::reset_instance();
        $this->resetAfterTest(true);
    }

    public function test_execute(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        // Create a widget directly via storage.
        $id = $storage->save_widget(null, [
            'key' => 'wkw1',
            'name' => 'W1',
            'author' => 'Me',
            'template' => 'template1',
            'version' => '1.0',
        ], 'content: yml');

        $this->assertGreaterThan(0, $id);

        // Execute retrieval (including all documents).
        $result = get_widgetsdocuments::execute([$id], true, true);
        $result = \core_external\external_api::clean_returnvalue(get_widgetsdocuments::execute_returns(), $result);

        $this->assertCount(1, $result);
        $this->assertEquals($id, $result[0]['id']);
        $this->assertEquals('wkw1', $result[0]['key']);
        $this->assertEquals("content: yml", $result[0]['yml']);
        $this->assertNotEmpty($result[0]['json']);

        $jsonobj = json_decode($result[0]['json']);
        $this->assertEquals('Me', $jsonobj->author);
        $this->assertEquals('1.0', $jsonobj->version);
        $this->assertNotNull($jsonobj->author);
        $this->assertNotNull($jsonobj->version);
    }

    public function test_execute_without_yml(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        $id = $storage->save_widget(null, [
            'key' => 'wkw1',
            'name' => 'W1',
            'author' => 'Me',
            'template' => 'template1',
            'version' => '1.0',
        ]);
        $this->assertGreaterThan(0, $id);
        // Request without YML.
        $result = get_widgetsdocuments::execute([$id], true, false);
        $result = \core_external\external_api::clean_returnvalue(get_widgetsdocuments::execute_returns(), $result);
        $this->assertCount(1, $result);
        $this->assertArrayHasKey('json', $result[0]);
        $this->assertArrayNotHasKey('yml', $result[0]);
    }

    public function test_execute_no_yml(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        $id = $storage->save_widget(null, [
            'key' => 'wkw1',
            'name' => 'W1',
            'author' => 'Me',
            'template' => 'template1',
            'version' => '1.0',
        ], "yml content");
        $this->assertGreaterThan(0, $id);
        // Request without YML.
        $result = get_widgetsdocuments::execute([$id], true, false);
        $result = \core_external\external_api::clean_returnvalue(get_widgetsdocuments::execute_returns(), $result);
        $this->assertCount(1, $result);
        $this->assertArrayHasKey('json', $result[0]);
        $this->assertArrayNotHasKey('yml', $result[0]);
    }

    public function test_execute_no_json(): void {
        $this->setAdminUser();
        $storage = storagefactory::get_instance();

        $id = $storage->save_widget(null, [
            'key' => 'wkw1',
            'name' => 'W1',
            'template' => 'template1',
            'author' => 'Me',
            'version' => '1.0',
        ], "yml content");

        $this->assertGreaterThan(0, $id);
        // Request without JSON.
        $result = get_widgetsdocuments::execute([$id], false, true);
        $result = \core_external\external_api::clean_returnvalue(get_widgetsdocuments::execute_returns(), $result);
        $this->assertCount(1, $result);
        $this->assertArrayNotHasKey('json', $result[0]);
        $this->assertArrayHasKey('yml', $result[0]);
    }
}
