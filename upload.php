<?php

session_start();

header('Content-Type: application/json');

$correctPassword = "a";
$password = $_POST["password"] ?? '';

// Verify password
if ($password !== $correctPassword) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Invalid password"]);
    exit;
}

// Set session after successful authentication
$_SESSION['uploading'] = true;

if (!isset($_FILES["video"])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No video uploaded"]);
    exit;
}



$videoDir = "videos/";
$thumbDir = "thumbnails/";



$videoName =
    basename($_FILES["video"]["name"]);

$videoTmp =
    $_FILES["video"]["tmp_name"];

$videoPath =
    $videoDir . $videoName;



if (!move_uploaded_file(
    $videoTmp,
    $videoPath
)) {

    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Video upload failed"]);
    exit;

}



/* -------------------------
   HANDLE THUMBNAIL
------------------------- */

if (isset($_FILES["thumbnail"])) {

    $baseName =
        pathinfo(
            $videoName,
            PATHINFO_FILENAME
        );

    $thumbPath =
        $thumbDir .
        $baseName .
        ".jpg";



    move_uploaded_file(
        $_FILES["thumbnail"]["tmp_name"],
        $thumbPath
    );

}

echo json_encode(["success" => true, "message" => "Upload successful"]);

?>