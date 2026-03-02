<?php

/**
 * Behat steps definitions for your Moodle plugin.
 *
 * @package    tiny_widgethub
 * @category   test
 * @copyright  2026 Josep Mulet 
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// NOTE: The class name MUST start with 'behat_' followed by the plugin name.
// The file must be located in {plugin_root}/tests/behat/

use Behat\Gherkin\Node\PyStringNode;
use Behat\Gherkin\Node\TableNode;
use Behat\Mink\Exception\ExpectationException;

/**
 * Custom Behat steps for tiny_widgethub.
 */
class behat_tiny_widgethub extends behat_base {

    /**
     * Changes the window size to a specific resolution.
     * * Note: This is particularly useful for testing Moodle's 
     * responsive "Clean" or "Boost" themes in Docker.
     *
     * @Given /^I set the window size to "(?P<width>\d+)"x"(?P<height>\d+)"$/
     * @param int $width
     * @param int $height
     */
    public function i_set_the_window_size_to_x($width, $height) {
        $this->getSession()->getDriver()->resizeWindow((int)$width, (int)$height, null);
    }
}
