<?php

header('Content-Type: application/json');

$videoDir = "videos/";
$thumbDir = "thumbnails/";
$titleFile = "data/video_titles.json";

$videos = [];

// Get all video files
if (is_dir($videoDir)) {
    $files = scandir($videoDir);
    
    // Load titles if they exist
    $titles = [];
    if (file_exists($titleFile)) {
        $titles = json_decode(file_get_contents($titleFile), true);
    }
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        $lower = strtolower($file);
        if (preg_match('/\.(mp4|webm|mov)$/', $lower)) {
            $basename = pathinfo($file, PATHINFO_FILENAME);
            $thumbnail = $thumbDir . $basename . ".jpg";
            
            $videos[] = [
                "filename" => $file,
                "basename" => $basename,
                "title" => $titles[$basename] ?? $basename,
                "hasThumbnail" => file_exists($thumbnail),
                "size" => filesize($videoDir . $file)
            ];
        }
    }
}

usort($videos, fn($a, $b) => strcmp($a['filename'], $b['filename']));

echo json_encode(["success" => true, "videos" => $videos]);

?>
