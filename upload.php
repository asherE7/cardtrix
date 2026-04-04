<?php

$correctPassword = "a$her3699!";

if ($_POST["password"] !== $correctPassword) {
    http_response_code(403);
    echo "Invalid password";
    exit;
}



if (!isset($_FILES["video"])) {
    echo "No video uploaded";
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

    echo "Video upload failed";
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



echo "Upload successful";

?>