<?php
// This file is part of Moodle - https://moodle.org/
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
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Optimized assets loader for WidgetHub.
 *
 * @package     tiny_widgethub
 * @copyright   2026 Josep Mulet <pep.mulet@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// phpcs:disable moodle.Files.RequireLogin.Missing

// Micro-Bootstrap (The "Optimized" Moodle Load).
define('NO_DEBUG_DISPLAY', true);
define('ABORT_AFTER_CONFIG', true);
require_once(__DIR__ . '/../../../../../config.php');
require_once($CFG->libdir . '/jslib.php'); // Provides the min_ functions.

$slashargument = min_get_slash_argument();

if ($slashargument) {
    $slashargument = ltrim($slashargument, '/');
    $args = explode('/', $slashargument, 3);
} else {
    // Fallback if slash arguments are disabled in Site Admin > Server > HTTP.
    $args = [
        min_optional_param('type', 'js', 'SAFEDIR'),
        min_optional_param('rev', 1, 'INT'),
        min_optional_param('name', 'bundle', 'SAFEDIR'),
    ];
}

if (count($args) < 3 || empty($args[0])) {
    header("HTTP/1.1 404 Not Found");
    die('Invalid path');
}

$type = min_clean_param($args[0], 'SAFEDIR');
$rev  = min_clean_param($args[1], 'INT');
$name = min_clean_param($args[2], 'SAFEDIR');

// Verification.
if ($rev < -1 || empty($name)) {
    header("HTTP/1.1 400 Bad Request");
    die('Security violation');
}

// Performance Headers & Security.
if ($type !== 'js') {
    header("HTTP/1.1 400 Bad Request");
    die('Invalid type');
}

// SAFEDIR leaves only [a-zA-Z0-9_-], so $name can never escape the js/ folder.
$cachefile = __DIR__ . '/js/' . $name . '.min.js';

if (!is_file($cachefile)) {
    header('HTTP/1.1 404 Not Found');
    die('Static asset not found');
}

header('Content-Type: application/javascript; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header("Cache-Control: public, max-age=$expires, immutable");
header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $expires) . ' GMT');

// Check ETag for 304 Not Modified.
$mtime = filemtime($cachefile);
$etag = '"' . $mtime . '-' . md5($cachefile) . '"';
header("ETag: $etag");

if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
    header("HTTP/1.1 304 Not Modified");
    die;
}

header('Content-Length: ' . filesize($cachefile));
readfile($cachefile);
die;
