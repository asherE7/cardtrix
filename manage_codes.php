<?php

$file = "data/promo_codes.json";

$codes = json_decode(file_get_contents($file), true);

$action = $_GET['action'] ?? '';

if ($action === 'list') {

    echo json_encode($codes);

    exit;

}

$code = $_POST['code'] ?? '';

if (!$code) exit;

if ($action === 'add') {

    if (!in_array($code, $codes)) {

        $codes[] = $code;

    }

}

if ($action === 'delete') {

    $codes = array_values(array_filter($codes, fn($c) => $c !== $code));

}

file_put_contents($file, json_encode($codes, JSON_PRETTY_PRINT));

?>