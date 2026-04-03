function uploadVideo() {
    const password = document.getElementById("adminPassword").value;
    const file = document.getElementById("videoFile").files[0];

    if (!file) {
        alert("Select a video first");
        return;
    }

    const formData = new FormData();
    formData.append("password", password);
    formData.append("video", file);

    fetch("upload.php", {
        method: "POST",
        body: formData
    })
        .then(res => res.text())
        .then(msg => {
            alert(msg);
        });
}