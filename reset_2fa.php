<?php

header('Content-Type: application/json');

date_default_timezone_set('UTC');
session_start();

$secretFile = "data/2fa_secret.txt";
$password = $_POST['password'] ?? '';
$correctPassword = "a";

// Validate password
if ($password !== $correctPassword) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Invalid password"
    ]);
    exit;
}

if (file_exists($secretFile)) {
    if (unlink($secretFile)) {
        session_destroy();
        echo json_encode([
            "success" => true,
            "message" => "2FA reset successfully. Log in again to set up."
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            "success" => false,
            "message" => "Failed to reset 2FA"
        ]);
    }
} else {
    echo json_encode([
        "success" => true,
        "message" => "No 2FA to reset"
    ]);
}

?>
