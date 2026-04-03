<?php

$codes = json_decode(file_get_contents("data/promo_codes.json"), true);

$input = $_POST['code'] ?? '';

if (in_array($input, $codes)) {
    echo "valid";
} else {
    http_response_code(403);
    echo "invalid";
}

?>