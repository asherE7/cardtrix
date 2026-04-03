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

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", function (e) {

        if (e.lengthComputable) {

            const percent = Math.round((e.loaded / e.total) * 100);

            document.getElementById("progressBar").style.width = percent + "%";

        }

    });

    xhr.onload = function () {

        alert(xhr.responseText);

        document.getElementById("progressBar").style.width = "0%";

    };

    xhr.open("POST", "upload.php");

    xhr.send(formData);

}

function loadCodes() {

    fetch("manage_codes.php?action=list")
        .then(res => res.json())
        .then(codes => {

            const list = document.getElementById("codeList");

            list.innerHTML = "";

            codes.forEach(code => {

                const li = document.createElement("li");

                li.innerHTML = code +
                    " <button onclick=\"deleteCode('" + code + "')\">Delete</button>";

                list.appendChild(li);

            });

        });

}

function addCode() {

    const code = document.getElementById("newCode").value;

    fetch("manage_codes.php?action=add", {

        method: "POST",

        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },

        body: "code=" + encodeURIComponent(code)

    })
        .then(() => loadCodes());

}

function deleteCode(code) {
    window.onload = loadCodes;