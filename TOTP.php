<?php

// CRITICAL: TOTP must always use UTC time
// This ensures consistency across all timezones
date_default_timezone_set('UTC');

class TOTP {
    
    private $timeStep = 30; // Google Authenticator uses 30-second time steps
    private $digits = 6;    // 6-digit codes
    
    /**
     * Generate a random base32 secret
     */
    public function generateSecret() {
        $validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        $secret = "";
        
        for ($i = 0; $i < 32; $i++) {
            $secret .= $validChars[random_int(0, strlen($validChars) - 1)];
        }
        
        return $secret;
    }
    
    /**
     * Get the provisioning URI for QR code generation
     */
    public function getProvisioningUri($secret, $accountName = "Admin@CardTrix", $issuer = "CardTrix") {
        return "otpauth://totp/" . 
            urlencode($issuer . ":" . $accountName) . 
            "?secret=" . urlencode($secret) . 
            "&issuer=" . urlencode($issuer);
    }
    
    /**
     * Verify a TOTP code - checks current and adjacent time windows
     */
    public function verifyCode($secret, $code, $discrepancy = 2) {
        $code = trim($code);
        
        // Check current time window
        $time = floor(time() / $this->timeStep);
        
        // Check multiple time windows to handle time drift
        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $expectedCode = $this->generateCode($secret, $time + $i);
            
            if ($expectedCode == $code) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Generate a TOTP code for a given time window
     */
    public function generateCode($secret, $time) {
        // Decode the base32 secret to binary
        $secretBinary = $this->base32Decode($secret);
        
        if ($secretBinary === false) {
            return false;
        }
        
        // Create the time counter value (big-endian)
        $timeCounter = pack('N', $time);  // Upper 32 bits (usually 0)
        $timeCounter = chr(0) . chr(0) . chr(0) . chr(0) . substr($timeCounter, -4);
        
        // Generate HMAC-SHA1 hash
        $hmac = hash_hmac('sha1', $timeCounter, $secretBinary, true);
        
        // Extract the dynamic binary code
        $offset = ord($hmac[19]) & 0xf;  // Last byte determines offset
        $code = unpack('N', substr($hmac, $offset, 4));
        $code = $code[1] & 0x7fffffff;   // Remove sign bit
        $code = $code % pow(10, $this->digits);  // Get last 6 digits
        
        // Pad with zeros if necessary
        return str_pad($code, $this->digits, '0', STR_PAD_LEFT);
    }
    
    /**
     * Decode base32 string to binary
     * RFC 4648 base32 alphabet: ABCDEFGHIJKLMNOPQRSTUVWXYZ234567
     */
    private function base32Decode($input) {
        $alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        
        // Convert to uppercase and remove padding
        $input = strtoupper(str_replace('=', '', $input));
        
        $output = '';
        $value = 0;
        $bits = 0;
        
        for ($i = 0; $i < strlen($input); $i++) {
            $char = $input[$i];
            $index = strpos($alphabet, $char);
            
            if ($index === false) {
                continue;  // Skip invalid characters
            }
            
            $value = ($value << 5) | $index;
            $bits += 5;
            
            if ($bits >= 8) {
                $bits -= 8;
                $output .= chr(($value >> $bits) & 0xFF);
                $value &= (1 << $bits) - 1;
            }
        }
        
        return $output;
    }
}

?>