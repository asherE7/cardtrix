function checkCode() {
    const code = document.getElementById("promoCode").value;

    fetch("check_code.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "code=" + encodeURIComponent(code)
    })
        .then(res => {
            if (res.ok) {
                document.getElementById("promoSection").style.display = "none";
                document.getElementById("gallery").style.display = "block";
                loadVideos();
            } else {
                alert("Invalid promo code");
            }
        });
}

function loadVideos() {
    fetch("videos/")
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            const links = doc.querySelectorAll("a");
            const container = document.getElementById("videoContainer");

            container.innerHTML = "";

            links.forEach(link => {
                const href = link.getAttribute("href");

                if (href.endsWith(".mp4") || href.endsWith(".webm")) {
                    const video = document.createElement("video");
                    video.src = "videos/" + href;
                    video.controls = true;

                    container.appendChild(video);
                }
            });
        });
}