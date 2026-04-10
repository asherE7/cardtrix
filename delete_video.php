<?php

header('Content-Type: application/json');

$videoDir = "videos/";
$thumbDir = "thumbnails/";
$titleFile = "data/video_titles.json";

$basename = $_POST['basename'] ?? '';

if (!$basename) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No video specified"]);
    exit;
}

// Validate basename (prevent directory traversal)
if (strpos($basename, '/') !== false || strpos($basename, '\\') !== false) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid video"]);
    exit;
}

$videoFile = $videoDir . $basename;
$thumbFile = $thumbDir . pathinfo($basename, PATHINFO_FILENAME) . ".jpg";

$deleted = false;

// Delete video file
if (file_exists($videoFile)) {
    if (unlink($videoFile)) {
        $deleted = true;
    }
}

// Delete thumbnail if it exists
if (file_exists($thumbFile)) {
    unlink($thumbFile);
}

// Remove title if it exists
if (file_exists($titleFile)) {
    $titles = json_decode(file_get_contents($titleFile), true);
    $filebasename = pathinfo($basename, PATHINFO_FILENAME);
    if (isset($titles[$filebasename])) {
        unset($titles[$filebasename]);
        file_put_contents($titleFile, json_encode($titles, JSON_PRETTY_PRINT));
    }
}

if ($deleted) {
    echo json_encode(["success" => true, "message" => "Video deleted"]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to delete video"]);
}

?>
