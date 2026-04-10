<?php
// Simple password verification

$correctPassword = "a"; // your chosen password

$password = $_POST['password'] ?? '';

if ($password === $correctPassword) {
    echo json_encode([
        "success" => true
    ]);
} else {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Invalid password"
    ]);
}
?>