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

            const container =
                document.getElementById("videoContainer");

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

                    const filename =
                        href.split("/").pop();

                    createVideoPlayer(
                        container,
                        filename
                    );

                }

            });

            if (videoCount === 0) {

                container.innerHTML =
                    "<p>No videos found.</p>";

            }

            console.log(
                "Videos loaded:",
                videoCount
            );

        })

        .catch(err => {

            console.error(
                "Video loading error:",
                err
            );

            document.getElementById(
                "videoContainer"
            ).innerHTML =
                "<p>Error loading videos.</p>";

        });

}



/* =========================
   CREATE VIDEO PLAYER
========================= */

function createVideoPlayer(container, filename) {

    const wrapper =
        document.createElement("div");

    wrapper.style.marginBottom = "30px";



    /* ---------------------
       CLEAN FILENAME
    --------------------- */

    let cleanName = filename;

    if (cleanName.startsWith("videos/")) {
        cleanName =
            cleanName.replace("videos/", "");
    }

    const baseName =
        cleanName
            .split("/")
            .pop()
            .replace(/\.[^/.]+$/, "");



    /* ---------------------
       TITLE
    --------------------- */

    const title =
        document.createElement("h3");

    title.textContent = baseName;

    wrapper.appendChild(title);



    /* ---------------------
       THUMB CONTAINER
    --------------------- */

    const thumbContainer =
        document.createElement("div");

    thumbContainer.style.position =
        "relative";

    thumbContainer.style.cursor =
        "pointer";



    /* ---------------------
       THUMBNAIL IMAGE
    --------------------- */

    const thumbnail =
        document.createElement("img");

    thumbnail.src =
        "thumbnails/" +
        baseName +
        ".jpg";

    thumbnail.alt = cleanName;

    thumbnail.style.width = "100%";
    thumbnail.style.display = "block";
    thumbnail.style.background =
        "black";

    thumbnail.style.borderRadius =
        "8px";



    /* ---------------------
       PLAY BUTTON
    --------------------- */

    // Play button removed - click thumbnail to play

    thumbContainer.appendChild(
        thumbnail
    );

    // thumbContainer.appendChild(
    //     playButton
    // );



    /* ---------------------
       CLICK → LOAD VIDEO
    --------------------- */

    thumbContainer.addEventListener(
        "click",
        () => {

            console.log(
                "Loading video:",
                cleanName
            );

            const video =
                document.createElement(
                    "video"
                );

            video.controls = true;

            video.autoplay = true;

            video.style.width =
                "100%";

            video.style.background =
                "black";



            const source =
                document.createElement(
                    "source"
                );

            source.src =
                "videos/" +
                cleanName;

            source.type =
                getVideoType(
                    cleanName
                );

            video.appendChild(source);



            video.addEventListener(
                "error",
                () => {

                    console.error(
                        "Video failed:",
                        source.src
                    );

                }
            );



            wrapper.replaceChild(
                video,
                thumbContainer
            );

        }
    );



    wrapper.appendChild(
        thumbContainer
    );

    container.appendChild(
        wrapper
    );

}



/* =========================
   DETECT VIDEO TYPE
========================= */

function getVideoType(filename) {

    const lower =
        filename.toLowerCase();

    if (lower.endsWith(".mp4"))
        return "video/mp4";

    if (lower.endsWith(".webm"))
        return "video/webm";

    if (lower.endsWith(".mov"))
        return "video/quicktime";

    return "video/mp4";

}