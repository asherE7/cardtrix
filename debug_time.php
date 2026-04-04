<?php

// Simple debug endpoint to check server time
header('Content-Type: application/json');

echo json_encode([
    'server_time' => time(),
    'server_timezone' => date_default_timezone_get(),
    'server_date' => date('Y-m-d H:i:s'),
    'php_version' => phpversion()
]);

?>
