<?php

header('Content-Type: application/json');

$file = "data/promo_codes.json";

if (!file_exists($file)) {
    $codes = [];
} else {
    $codes = json_decode(file_get_contents($file), true);
}

$code = $_POST['code'] ?? '';

if (!$code) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No code provided"]);
    exit;
}

// Prevent duplicates
if (in_array($code, $codes)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Code already exists"]);
    exit;
}

$codes[] = $code;

if (file_put_contents($file, json_encode($codes, JSON_PRETTY_PRINT))) {
    echo json_encode(["success" => true, "message" => "Code added"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to save code"]);
}

?>
