<?php
// Fallback verification that accepts both new and old password
// Used for password recovery if change failed

header('Content-Type: application/json');

session_start();

$password = $_POST['password'] ?? '';
$useOldPassword = $_POST['useOldPassword'] ?? false;

// Current (new) password
$newPassword = "a"; // This will be updated when password is changed

// Old/fallback password
$oldPassword = "a"; // Hardcoded old password for fallback

$isValid = false;

if ($useOldPassword) {
    // Use fallback (old) password
    $isValid = ($password === $oldPassword);
} else {
    // Use current password (try to read from verify_password.php)
    $verifyContent = file_get_contents("verify_password.php");
    
    // Extract the password from verify_password.php using regex
    if (preg_match('/\$correctPassword\s*=\s*"([^"]*)";/', $verifyContent, $matches)) {
        $currentPassword = $matches[1];
        $isValid = ($password === $currentPassword);
    } else {
        $isValid = ($password === $newPassword);
    }
}

if ($isValid) {
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
