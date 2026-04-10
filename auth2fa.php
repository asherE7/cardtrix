<?php

// CRITICAL: TOTP must always use UTC time
date_default_timezone_set('UTC');

session_start();

header('Content-Type: application/json');

require_once "TOTP.php";

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$secretFile = "data/2fa_secret.txt";

// Create data directory if it doesn't exist
if (!is_dir("data")) {
    mkdir("data", 0755, true);
}

// GET CURRENT TOTP SECRET
if ($action === 'getSecret') {
    
    // VALIDATE PASSWORD FIRST - THIS IS THE KEY FIX
    $password = $_GET['password'] ?? $_POST['password'] ?? '';
    $correctPassword = "a"; // Your admin password
    
    if ($password !== $correctPassword) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid password'
        ]);
        exit;
    }
    
    // Only proceed if password is correct
    if (file_exists($secretFile)) {
        // Return existing secret (already setup)
        echo json_encode([
            'status' => 'exists',
            'message' => '2FA already configured'
        ]);
    } else {
        // Generate new secret
        $totp = new TOTP();
        $secret = $totp->generateSecret();
        
        // Store it temporarily (will be confirmed after user scans QR)
        $_SESSION['temp_secret'] = $secret;
        
        $uri = $totp->getProvisioningUri($secret);
        
        // Generate QR code URL using a free QR service
        $qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" . urlencode($uri);
        
        echo json_encode([
            'status' => 'new',
            'secret' => $secret,
            'qrUrl' => $qrUrl,
            'uri' => $uri
        ]);
    }
    exit;
}

// VERIFY 2FA CODE
if ($action === 'verify') {
    
    $code = $_POST['code'] ?? '';
    $password = $_POST['password'] ?? '';
    $newSecret = $_POST['newSecret'] ?? ''; // New secret to save on first setup
    
    $correctPassword = "a"; // Your admin password
    
    // First verify password
    if ($password !== $correctPassword) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid password']);
        exit;
    }
    
    // On first setup, use the new secret provided by client
    if (!file_exists($secretFile) && $newSecret) {
        // Verify the code with the new secret first
        $totp = new TOTP();
        if (!$totp->verifyCode($newSecret, $code)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Invalid 2FA code']);
            exit;
        }
        // Code is valid, now save the secret
        file_put_contents($secretFile, $newSecret);
        $_SESSION['admin_authenticated'] = true;
        echo json_encode(['success' => true, 'message' => '2FA verification successful']);
        exit;
    }
    
    // For existing setups, verify against the file
    if (!file_exists($secretFile)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => '2FA not configured']);
        exit;
    }
    
    $secret = trim(file_get_contents($secretFile));
    $totp = new TOTP();
    
    if ($totp->verifyCode($secret, $code)) {
        // Set session as authenticated
        $_SESSION['admin_authenticated'] = true;
        echo json_encode(['success' => true, 'message' => '2FA verification successful']);
    } else {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid 2FA code']);
    }
    exit;
}

// RESET 2FA (for re-setup)
if ($action === 'reset') {
    
    $password = $_POST['password'] ?? '';
    $correctPassword = "a"; // Your admin password
    
    if ($password !== $correctPassword) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid password']);
        exit;
    }
    
    if (file_exists($secretFile)) {
        unlink($secretFile);
        echo json_encode(['success' => true, 'message' => '2FA reset']);
    } else {
        echo json_encode(['success' => false, 'message' => '2FA not configured']);
    }
    exit;
}

?>