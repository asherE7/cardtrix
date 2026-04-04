<?php

// CRITICAL: Use UTC for consistency
date_default_timezone_set('UTC');

require_once "TOTP.php";

header('Content-Type: text/html; charset=utf-8');

echo "<h1>CardTrix Diagnostic Report</h1>";
echo "<hr>";

// Check PHP version
echo "<h2>Server Info</h2>";
echo "PHP Version: " . phpversion() . "<br>";
echo "Server Time: " . date('Y-m-d H:i:s') . "<br>";
echo "Unix Timestamp: " . time() . "<br>";
echo "Timezone: " . date_default_timezone_get() . "<br>";
echo "<hr>";

// Check data folder
echo "<h2>Data Folder Permissions</h2>";
$dataDir = "data";

if (!is_dir($dataDir)) {
    echo "<span style='color: red;'>✗ data/ folder DOES NOT EXIST</span><br>";
    echo "Attempting to create it...<br>";
    if (mkdir($dataDir, 0755, true)) {
        echo "<span style='color: green;'>✓ Successfully created data/ folder</span><br>";
    } else {
        echo "<span style='color: red;'>✗ FAILED to create data/ folder - PERMISSION ISSUE</span><br>";
    }
} else {
    echo "<span style='color: green;'>✓ data/ folder EXISTS</span><br>";
}

// Check if data folder is writable
if (is_writable($dataDir)) {
    echo "<span style='color: green;'>✓ data/ folder is WRITABLE</span><br>";
} else {
    echo "<span style='color: red;'>✗ data/ folder is NOT WRITABLE - PERMISSION ISSUE</span><br>";
}

// Check if secret file exists
$secretFile = "data/2fa_secret.txt";
if (file_exists($secretFile)) {
    echo "2FA Secret file exists<br>";
    $secret = trim(file_get_contents($secretFile));
    echo "Stored secret: " . $secret . "<br>";
} else {
    echo "No 2FA secret file yet (normal on first setup)<br>";
}

echo "<hr>";

// Test TOTP Algorithm
echo "<h2>TOTP Algorithm Test</h2>";

$totp = new TOTP();
$testSecret = "JBSWY3DPEBLW64TMMQ======";  // Standard test secret

echo "Test Secret: " . $testSecret . "<br>";
echo "Current Time: " . time() . "<br>";
echo "<br>";

// Generate codes for the last 3 time windows
$currentTime = time();
$timeStep = 30;
$currentWindow = floor($currentTime / $timeStep);

echo "Expected TOTP codes for different time windows:<br>";
for ($i = -2; $i <= 2; $i++) {
    $window = $currentWindow + $i;
    $windowTime = $window * $timeStep;
    $code = str_pad(
        substr(
            sprintf('%010d', 
                (int)(
                    (ord(substr(
                        hash_hmac('sha1', 
                            pack('N', $window),
                            base64_decode('HN423QULBIFZSWTJ4XMYQTCEKQ======'),
                            true
                        ), -1
                    )) & 0xf) * pow(10, 6) / 16
                )
            ),
            -6
        ),
        6,
        '0',
        STR_PAD_LEFT
    );
    
    $offset = $i === 0 ? " (CURRENT)" : ($i > 0 ? " (FUTURE)" : " (PAST)");
    echo "Window " . $i . $offset . ": Code would be generated (algorithm test)<br>";
}

echo "<hr>";

// Test file write
echo "<h2>File Write Test</h2>";
$testFile = "data/test_write.txt";
$testContent = "Test write - " . time();

if (file_put_contents($testFile, $testContent)) {
    echo "<span style='color: green;'>✓ Successfully wrote test file</span><br>";
    if (file_exists($testFile)) {
        echo "<span style='color: green;'>✓ Test file readable</span><br>";
        unlink($testFile);
        echo "<span style='color: green;'>✓ Test file deleted</span><br>";
    }
} else {
    echo "<span style='color: red;'>✗ FAILED to write test file - PERMISSION ISSUE</span><br>";
}

echo "<hr>";

// Summary
echo "<h2>Summary</h2>";
echo "<p>If you see RED errors above, you have a <strong>server permission issue</strong>.</p>";
echo "<p>Contact your hosting provider (Hostinger) and ask them to:</p>";
echo "<ul>";
echo "<li>Make the 'data' folder writable (chmod 755 or 777)</li>";
echo "<li>Check PHP process permissions</li>";
echo "</ul>";

?>