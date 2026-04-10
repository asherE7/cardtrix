<?php

$file = "data/promo_codes.json";

if (!file_exists($file)) {
    echo json_encode(["codes" => []]);
    exit;
}

$codes = json_decode(file_get_contents($file), true);

// Format codes with creation data
$formattedCodes = [];
foreach ($codes as $code) {
    $formattedCodes[] = [
        "code" => $code,
        "created_at" => date("Y-m-d")
    ];
}

echo json_encode(["codes" => $formattedCodes]);

?>
