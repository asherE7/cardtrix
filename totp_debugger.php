<?php

// CRITICAL: Use UTC for TOTP consistency
date_default_timezone_set('EST');

require_once "TOTP.php";

header('Content-Type: text/html; charset=utf-8');

$secret = $_GET['secret'] ?? '';
$testCode = $_GET['code'] ?? '';

?>

<!DOCTYPE html>
<html>
<head>
    <title>TOTP Code Debugger</title>
    <style>
        body {
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            background: #0f172a;
            color: white;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        .box {
            background: #1e293b;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            border-left: 4px solid #2563eb;
        }
        input {
            padding: 10px;
            margin: 5px;
            font-size: 16px;
            border-radius: 5px;
            border: none;
            width: 300px;
        }
        button {
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #1d4ed8;
        }
        .code-display {
            font-family: monospace;
            font-size: 32px;
            background: #0f172a;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            letter-spacing: 5px;
            margin: 10px 0;
        }
        .success {
            color: #10b981;
        }
        .error {
            color: #ef4444;
        }
        .info {
            color: #60a5fa;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }
        td, th {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #334155;
        }
        th {
            background: #0f172a;
        }
    </style>
</head>
<body>

<h1>TOTP Code Debugger</h1>

<div class="box">
    <h2>Step 1: Enter Your Secret</h2>
    <p>Copy the secret from your admin page (the long key with spaces):</p>
    <form method="GET">
        <input type="text" name="secret" placeholder="e.g. ABCD EFGH IJKL MNOP..." value="<?php echo htmlspecialchars($secret); ?>">
        <button type="submit">Load Secret</button>
    </form>
</div>

<?php

if ($secret) {
    // Clean the secret (remove spaces)
    $cleanSecret = strtoupper(str_replace(' ', '', $secret));
    
    echo '<div class="box">';
    echo '<h2>Secret Information</h2>';
    echo 'Entered Secret: <code>' . htmlspecialchars($secret) . '</code><br>';
    echo 'Cleaned Secret: <code>' . $cleanSecret . '</code><br>';
    echo 'Length: ' . strlen($cleanSecret) . ' characters<br>';
    echo '</div>';
    
    $totp = new TOTP();
    
    // Generate codes for current and nearby time windows
    echo '<div class="box">';
    echo '<h2>Expected TOTP Codes</h2>';
    echo '<p>These are the codes our server generates:</p>';
    
    $currentTime = time();
    $timeStep = 30;
    $currentWindow = floor($currentTime / $timeStep);
    $secondsInWindow = $currentTime % $timeStep;
    $secondsRemaining = $timeStep - $secondsInWindow;
    
    echo '<table>';
    echo '<tr><th>Window</th><th>Time</th><th>Seconds Left</th><th>Code</th></tr>';
    
    for ($i = -2; $i <= 2; $i++) {
        // Generate code using reflection to access private method
        $reflection = new ReflectionMethod('TOTP', 'generateCode');
        $reflection->setAccessible(true);
        $code = $reflection->invoke($totp, $cleanSecret, $currentWindow + $i);
        
        $windowTime = ($currentWindow + $i) * $timeStep;
        $label = $i === 0 ? '(CURRENT)' : ($i > 0 ? '(FUTURE)' : '(PAST)');
        
        if ($i === 0) {
            echo '<tr style="background: #1e3a1f;">';
        } else {
            echo '<tr>';
        }
        
        echo '<td>Window ' . ($i >= 0 ? '+' : '') . $i . ' ' . $label . '</td>';
        echo '<td>' . date('H:i:s', $windowTime) . '</td>';
        echo '<td>' . ($i === 0 ? $secondsRemaining : '-') . 's</td>';
        echo '<td><strong class="code-display">' . $code . '</strong></td>';
        echo '</tr>';
    }
    echo '</table>';
    
    echo '<p><strong>Current Server Time:</strong> ' . date('Y-m-d H:i:s') . ' (Unix: ' . $currentTime . ')</p>';
    echo '</div>';
    
    // Test verification
    if ($testCode) {
        echo '<div class="box">';
        echo '<h2>Code Verification Test</h2>';
        
        $testCode = str_replace(' ', '', $testCode);
        
        if ($totp->verifyCode($cleanSecret, $testCode)) {
            echo '<p class="success">✓ CODE VERIFIED! This code is correct!</p>';
        } else {
            echo '<p class="error">✗ CODE NOT VERIFIED - This code doesn\'t match</p>';
            echo '<p>This could mean:</p>';
            echo '<ul>';
            echo '<li>You entered the code from a different time window</li>';
            echo '<li>Your phone time is out of sync</li>';
            echo '<li>There\'s a bug in the algorithm</li>';
            echo '</ul>';
        }
        
        echo '</div>';
    }
    
    // Test code entry
    echo '<div class="box">';
    echo '<h2>Step 2: Test Your Code</h2>';
    echo '<p>Enter a 6-digit code from your authenticator app:</p>';
    echo '<form method="GET">';
    echo '<input type="hidden" name="secret" value="' . htmlspecialchars($secret) . '">';
    echo '<input type="text" name="code" placeholder="000000" maxlength="6" value="' . htmlspecialchars($testCode) . '">';
    echo '<button type="submit">Verify Code</button>';
    echo '</form>';
    echo '</div>';
}

?>

</body>
</html>