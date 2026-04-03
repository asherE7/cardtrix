/* =========================
   PROMO CODE CHECK
========================= */

function checkCode() {

    const code = document.getElementById("promoCode").value.trim();

    if (!code) {
        alert("Please enter a promo code");
        return;
    }

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

        })

        .catch(err => {

            console.error("Promo check failed:", err);

            alert("Server error checking code");

        });

}



/* =========================
   LOAD VIDEOS
========================= */

function loadVideos() {

    console.log("Loading videos...");

    fetch("videos/")

        .then(res => {

            if (!res.ok) {
                throw new Error("Cannot access videos folder");
            }

            return res.text();

        })

        .then(html => {

            const parser = new DOMParser();

            const doc = parser.parseFromString(html, "text/html");

            const links = doc.querySelectorAll("a");

            const container = document.getElementById("videoContainer");

            container.innerHTML = "";

            let videoCount = 0;

            links.forEach(link => {

                const href = link.getAttribute("href");

                if (!href) return;

                const lower = href.toLowerCase();

                if (
                    lower.endsWith(".mp4") ||
                    lower.endsWith(".webm") ||
                    lower.endsWith(".mov")
                ) {

                    videoCount++;

                    createVideoPlayer(container, href.replace(/^.*\//, ""));

                }

            });

            if (videoCount === 0) {

                container.innerHTML =
                    "<p>No videos found.</p>";

            }

            console.log("Videos loaded:", videoCount);

        })

        .catch(err => {

            console.error("Video loading error:", err);

            document.getElementById("videoContainer").innerHTML =
                "<p>Error loading videos.</p>";

        });

}



/* =========================
   CREATE VIDEO PLAYER
========================= */

function createVideoPlayer(container, filename) {

    const wrapper = document.createElement("div");

    wrapper.style.marginBottom = "30px";



    /* Clean filename */

    let cleanName = filename;

    if (cleanName.startsWith("videos/")) {
        cleanName = cleanName.replace("videos/", "");
    }



    /* Title */

    const title = document.createElement("h3");

    title.textContent = cleanName;

    wrapper.appendChild(title);



    /* Video */

    const video = document.createElement("video");

    video.controls = true;

    video.preload = "metadata";

    video.style.width = "100%";

    video.style.background = "black";



    const source = document.createElement("source");

    source.src = "videos/" + cleanName;

    source.type = getVideoType(cleanName);



    video.appendChild(source);

    video.load();



    video.addEventListener("error", () => {

        console.error("Video failed:", source.src);

    });



    wrapper.appendChild(video);

    container.appendChild(wrapper);

}



/* =========================
   DETECT VIDEO TYPE
========================= */

function getVideoType(filename) {

    const lower = filename.toLowerCase();

    if (lower.endsWith(".mp4"))
        return "video/mp4";

    if (lower.endsWith(".webm"))
        return "video/webm";

    if (lower.endsWith(".mov"))
        return "video/quicktime";

    return "video/mp4";

}