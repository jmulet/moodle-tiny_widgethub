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
 * Unit tests for documentstorageimpl.
 *
 * @package    tiny_widgethub
 * @copyright  2026 Josep Mulet <pep.mulet@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_widgethub\local\storage;

/**
 * Unit tests for documentstorageimpl.
 *
 * @group tiny_widgethub
 * @covers \tiny_widgethub\local\storage\documentstorageimpl
 */
final class documentstorageimpl_test extends \advanced_testcase {
    /**
     * Set up.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test save and get.
     */
    public function test_save_and_get(): void {
        $cfg = new \stdClass();
        $storage = new documentstorageimpl($cfg);
        $id = 123;
        $content = "test content";

        // Save JSON.
        $this->assertTrue($storage->save($id, $content, 'json'));
        $this->assertEquals($content, $storage->get($id, 'json'));

        // Save YML.
        $this->assertTrue($storage->save($id, $content, 'yml'));
        $this->assertEquals($content, $storage->get($id, 'yml'));

        // Save JS.
        $this->assertTrue($storage->save($id, $content, 'js'));
        $this->assertEquals($content, $storage->get($id, 'js'));

        // Save CSS.
        $this->assertTrue($storage->save($id, $content, 'css'));
        $this->assertEquals($content, $storage->get($id, 'css'));
    }

    /**
     * Test delete.
     */
    public function test_delete(): void {
        $storage = new documentstorageimpl();
        $id = 123;
        $content = "test content";

        $res = $storage->save($id, $content, 'json');
        $this->assertTrue($res);
        $this->assertEquals($content, $storage->get($id, 'json'));

        $this->assertTrue($storage->delete($id, 'json'));
        $this->assertNull($storage->get($id, 'json'));

        // Delete non-existing.
        $this->assertTrue($storage->delete($id, 'json'));
    }

    /**
     * Test delete_all.
     */
    public function test_delete_all(): void {
        $storage = new documentstorageimpl();
        $id = 123;
        $content = "test content";

        $storage->save($id, $content . 'json', 'json');
        $storage->save($id, $content . 'slim.json', 'slim.json');
        $storage->save($id, $content . 'yml', 'yml');

        $this->assertEquals($content . 'json', $storage->get($id, 'json'));
        $this->assertEquals($content . 'slim.json', $storage->get($id, 'slim.json'));
        $this->assertEquals($content . 'yml', $storage->get($id, 'yml'));

        $storage->delete_all($id);

        $this->assertNull($storage->get($id, 'json'));
        $this->assertNull($storage->get($id, 'slim.json'));
        $this->assertNull($storage->get($id, 'yml'));
    }
}
