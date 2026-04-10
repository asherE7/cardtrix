<?php

header('Content-Type: application/json');

session_start();

$oldPassword = $_POST['oldPassword'] ?? '';
$newPassword = $_POST['newPassword'] ?? '';
$correctPassword = "a"; // Current password

// Verify old password
if ($oldPassword !== $correctPassword) {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Invalid current password"
    ]);
    exit;
}

// Validate new password
if (strlen($newPassword) < 4) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "New password must be at least 4 characters"
    ]);
    exit;
}

if ($newPassword === $correctPassword) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "New password must be different from current password"
    ]);
    exit;
}

// List of all files that need password updates
$filesToUpdate = [
    "verify_password.php",
    "upload.php",
    "auth2fa.php",
    "reset_2fa.php",
    "get_2fa_status.php"
];

$successCount = 0;
$failedFiles = [];

// Update each file
foreach ($filesToUpdate as $file) {
    if (!file_exists($file)) {
        $failedFiles[] = "$file (not found)";
        continue;
    }

    $content = file_get_contents($file);
    if ($content === false) {
        $failedFiles[] = "$file (read failed)";
        continue;
    }

    // Simple replacement: find the line and replace it
    // This matches: $correctPassword = "anything";
    $pattern = '/\$correctPassword\s*=\s*"[^"]*";/';
    $newLine = '$correctPassword = ' . json_encode($newPassword) . ';';
    
    $newContent = preg_replace($pattern, $newLine, $content, -1, $count);
    
    if ($count === 0) {
        $failedFiles[] = "$file (pattern not found)";
        continue;
    }

    // Write back only if changes were made
    if ($newContent !== $content) {
        $bytesWritten = file_put_contents($file, $newContent);
        if ($bytesWritten === false) {
            $failedFiles[] = "$file (write failed)";
        } else {
            $successCount++;
        }
    } else {
        $successCount++;
    }
}

// Report results
if ($successCount === count($filesToUpdate)) {
    echo json_encode([
        "success" => true,
        "message" => "Password updated successfully in all " . $successCount . " files!"
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to update password",
        "updated" => $successCount . "/" . count($filesToUpdate),
        "failed" => $failedFiles
    ]);
}

?>
