<?php

$admin_password = "a$her3699!";

if ($_POST['password'] !== $admin_password) {
    http_response_code(403);
    echo "Unauthorized";
    exit;
}

$target_dir = "videos/";

if (!is_dir($target_dir)) {
    mkdir($target_dir, 0755, true);
}

$filename = basename($_FILES["video"]["name"]);
$target_file = $target_dir . $filename;

if (move_uploaded_file($_FILES["video"]["tmp_name"], $target_file)) {
    echo "Upload successful";
} else {
    http_response_code(500);
    echo "Upload failed";
}

?>