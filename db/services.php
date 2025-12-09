<?php
defined('MOODLE_INTERNAL') || die();

$functions = [
    'tiny_widgethub_delete_widgets' => [
        'classname'   => 'tiny_widgethub\external',
        'methodname'  => 'delete_widgets',
        'description' => 'Deletes widgets by ID',
        'type'        => 'write',
        'ajax'        => true,
    ],
];