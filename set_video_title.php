<?php

header('Content-Type: application/json');

$titleFile = "data/video_titles.json";

// Create data directory if needed
if (!is_dir("data")) {
    mkdir("data", 0755, true);
}

$basename = $_POST['basename'] ?? '';
$title = $_POST['title'] ?? '';

if (!$basename) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No video specified"]);
    exit;
}

// Load existing titles
$titles = [];
if (file_exists($titleFile)) {
    $titles = json_decode(file_get_contents($titleFile), true);
}

if ($title === '') {
    // Delete title (revert to filename)
    unset($titles[$basename]);
} else {
    $titles[$basename] = $title;
}

if (file_put_contents($titleFile, json_encode($titles, JSON_PRETTY_PRINT))) {
    echo json_encode(["success" => true, "message" => "Title updated"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to update title"]);
}

?>
