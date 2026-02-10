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

namespace tiny_widgethub\local\storage;

use tiny_widgethub\local\storage\widgetstorageimpl;

/**
 * Unit tests for dbwidgetstorage with string-based author and version.
 *
 * @package    tiny_widgethub
 * @copyright  2026 Josep Mulet <pep.mulet@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_widgethub\local\storage\widgetstorageimpl
 */
final class widgetstorageimpl_test extends \advanced_testcase {
    protected function setUp(): void {
        global $DB;
        parent::setUp();
        $this->resetAfterTest(true);

        // Ensure the table is empty to pass test_initial_state.
        $DB->delete_records('files', ['component' => 'tiny_widgethub', 'filearea' => 'widgetdefs']);
    }

    /**
     * Helper to get standard dummy data with strings for author and version.
     * @param string $key The widget key.
     * @return array The widget data.
     */
    private function get_dummy_widget_data(string $key = 'test_widget'): array {
        return [
            'key'      => $key,
            'name'     => 'Test Widget',
            'category' => 'Test Category',
            'author'   => 'Josep Mulet', // STRING as requested.
            'version'  => '1.0.0-stable', // STRING as requested.
            'hidden'   => 0,
        ];
    }

    public function test_initial_state(): void {
        $storage = new widgetstorageimpl();
        $this->assertEquals([], $storage->get_all_widgets());
    }

    public function test_save_and_retrieve_widget(): void {
        $storage = new widgetstorageimpl();
        $data = $this->get_dummy_widget_data();

        $id = $storage->save_widget(0, $data);
        $this->assertGreaterThan(0, $id);

        $widget = $storage->get_widget_by_id($id);
        $this->assertNotFalse($widget);
        $this->assertEquals('Josep Mulet', $widget->author);
        $this->assertEquals('1.0.0-stable', $widget->version);
    }

    public function test_update_widget(): void {
        $storage = new widgetstorageimpl();

        // Save initial version.
        $id = $storage->save_widget(0, $this->get_dummy_widget_data('w1'));

        // Update with new string values.
        $updated = [
            'id'      => $id,
            'key'     => 'w1',
            'name'    => 'New Name',
            'author'  => 'Updated Author',
            'version' => '2.0.0',
        ];
        $storage->save_widget($id, $updated);

        $w = $storage->get_widget_by_id($id);
        $this->assertEquals('New Name', $w->name);
        $this->assertEquals('Updated Author', $w->author);
        $this->assertEquals('2.0.0', $w->version);
    }

    public function test_save_widget_with_files(): void {
        $storage = new widgetstorageimpl();
        $ymlcontent = "some: yaml";

        $data = $this->get_dummy_widget_data('w_yml');
        $id = $storage->save_widget(0, $data, $ymlcontent);
        $this->assertGreaterThan(0, $id);

        $docs = $storage->get_documents_by_id([$id], true, true);
        $this->assertCount(1, $docs);
        $this->assertEquals($ymlcontent, $docs[0]['yml']);
        $this->assertEquals(json_encode($data), $docs[0]['json']);
        $this->assertNull($docs[0]['js'] ?? null);
        $this->assertNull($docs[0]['css'] ?? null);
    }

    public function test_save_widget_with_all_assets(): void {
        $storage = new widgetstorageimpl();
        $yml = "some: yaml";
        $js = "console.log('js');";
        $css = ".test { color: red; }";

        $data = $this->get_dummy_widget_data('w_assets');
        $id = $storage->save_widget(0, $data, $yml, $js, $css);
        $this->assertGreaterThan(0, $id);

        $docs = $storage->get_documents_by_id([$id], true, true);
        $this->assertCount(1, $docs);
        $this->assertEquals($yml, $docs[0]['yml']);
        $this->assertEquals($js, $docs[0]['js']);
        $this->assertEquals($css, $docs[0]['css']);
    }

    public function test_delete_widget(): void {
        $storage = new widgetstorageimpl();
        $id = $storage->save_widget(0, $this->get_dummy_widget_data('w_del'));

        $this->assertTrue($storage->delete_widget($id));
        $this->assertFalse($storage->get_widget_by_id($id));
    }

    public function test_get_widgetsnoyml(): void {
        $storage = new widgetstorageimpl();

        // Widget 1: Has YML.
        $storage->save_widget(0, $this->get_dummy_widget_data('w1'), "yml content");
        // Widget 2: No YML.
        $id2 = $storage->save_widget(0, $this->get_dummy_widget_data('w2'), null);

        $noyml = $storage->get_widgetsnoyml();
        // Since get_widgetsnoyml returns IDs, check for presence.
        $this->assertContains((int)$id2, array_map('intval', $noyml));
    }

    public function test_get_widget_by_key(): void {
        $storage = new widgetstorageimpl();
        $storage->save_widget(0, $this->get_dummy_widget_data('unique_key'));

        $widget = $storage->get_widget_by_key('unique_key');
        $this->assertNotFalse($widget);
        $this->assertEquals('unique_key', $widget->key);

        $this->assertFalse($storage->get_widget_by_key('non_existent'));
    }

    public function test_get_used_keys(): void {
        $storage = new widgetstorageimpl();
        $storage->save_widget(0, $this->get_dummy_widget_data('k1'));
        $storage->save_widget(0, $this->get_dummy_widget_data('k2'));

        $keys = $storage->get_used_keys();
        $this->assertContains('k1', $keys);
        $this->assertContains('k2', $keys);
    }

    public function test_partials_persistence(): void {
        $storage = new widgetstorageimpl();
        $partialsdata = ['key' => 'partials', 'p1' => "v1"];

        $id = $storage->save_widget(null, $partialsdata, "p1: v1");
        $this->assertEquals(\tiny_widgethub\local\storage\storagefactory::PARTIALS_ID, $id);

        // Verify JSON partials.
        $partials = $storage->get_partials();
        $this->assertIsArray($partials);
        $this->assertEquals('v1', $partials['p1']);

        // Verify YML partials.
        $yml = $storage->get_partials_yml();
        $this->assertEquals("p1: v1", $yml);
    }

    public function test_get_all_documents(): void {
        $storage = new widgetstorageimpl();
        $id1 = $storage->save_widget(null, $this->get_dummy_widget_data('d1'), "yml1");
        $id2 = $storage->save_widget(null, $this->get_dummy_widget_data('d2'), "yml2");

        $this->assertGreaterThan(0, $id1);
        $this->assertGreaterThan(0, $id2);

        $docs = $storage->get_documents_by_id([$id1, $id2], true, true);
        $this->assertCount(2, $docs);

        $docs = $storage->get_documents_by_id(null, true, true);
        $this->assertCount(2, $docs);
    }

    public function test_delete_widgets(): void {
        $storage = new widgetstorageimpl();
        $id1 = $storage->save_widget(0, $this->get_dummy_widget_data('w1'));
        $id2 = $storage->save_widget(0, $this->get_dummy_widget_data('w2'));

        $this->assertCount(2, $storage->get_all_widgets());

        $deleted = $storage->delete_widgets([$id1, $id2]);
        $this->assertCount(2, $deleted);
        $this->assertCount(0, $storage->get_all_widgets());
    }

    public function test_save_widgetsyml(): void {
        $storage = new widgetstorageimpl();
        $id = $storage->save_widget(0, $this->get_dummy_widget_data('w1'), null);

        // Update YML for existing widget.
        $result = $storage->save_widgetsyml([
            ['id' => $id, 'key' => 'w1', 'yml' => "new: yml"],
        ]);

        $this->assertTrue($result[0]);
        $docs = $storage->get_documents_by_id([$id], false, true);
        $this->assertEquals("new: yml", $docs[0]['yml']);
        $this->assertNull($docs[0]['js'] ?? null);
        $this->assertNull($docs[0]['css'] ?? null);
    }
}
