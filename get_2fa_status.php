<?php

header('Content-Type: application/json');

date_default_timezone_set('UTC');
session_start();

require_once "TOTP.php";

$secretFile = "data/2fa_secret.txt";
$password = $_GET['password'] ?? $_POST['password'] ?? '';
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

// Check if 2FA is already set up
if (file_exists($secretFile)) {
    // 2FA already configured
    echo json_encode([
        "success" => true,
        "needsSetup" => false,
        "message" => "2FA already configured"
    ]);
    exit;
}

// Generate new secret for setup
$totp = new TOTP();
$secret = $totp->generateSecret();

// Store temporarily in session
$_SESSION['temp_secret'] = $secret;

// Generate provisioning URI for QR code
$uri = $totp->getProvisioningUri($secret);
$qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" . urlencode($uri);

echo json_encode([
    "success" => true,
    "needsSetup" => true,
    "secret" => $secret,
    "qrCode" => $qrUrl,
    "uri" => $uri,
    "message" => "2FA setup required"
]);

?>
