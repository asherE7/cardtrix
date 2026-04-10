let storedPassword = "";
let tempSecret = "";

/* ========================
   FORMAT SECRET WITH SPACES
======================== */

function formatSecret(secret) {
    // Add spaces every 4 characters for easier reading
    return secret.replace(/(.{4})/g, '$1 ').trim();
}

/* ========================
   STEP 1: VERIFY PASSWORD
======================== */

function verifyPassword() {

    const password =
        document.getElementById("adminPassword").value;

    if (!password) {
        alert("Enter password");
        return;
    }

    storedPassword = password;

    // Get 2FA secret or setup - NOW WITH PASSWORD VALIDATION
    fetch("auth2fa.php?action=getSecret&password=" + encodeURIComponent(password))
        .then(res => {

            // CHECK FOR HTTP ERRORS (403 = invalid password)
            if (!res.ok) {
                return res.json().then(data => {
                    throw new Error(data.message || "Authentication failed");
                });
            }

            return res.json();
        })
        .then(data => {

            if (data.status === 'new') {
                // First time setup
                tempSecret = data.secret;
                setupNewTotp(data.qrUrl, data.secret);
            } else {
                // Already configured, just verify
                showVerifyMode();
            }

            // Show 2FA screen - ONLY REACHED IF PASSWORD IS CORRECT
            document.getElementById("loginScreen").style.display = "none";
            document.getElementById("twoFAScreen").style.display = "block";

        })
        .catch(err => {
            console.error("Password verification error:", err);
            alert("Invalid password. Please try again.\n\n" + err.message);
            // Clear the password field
            document.getElementById("adminPassword").value = "";
        });

}

/* ========================
   SETUP NEW TOTP
======================== */

function setupNewTotp(qrUrl, secret) {

    document.getElementById("setupMode").style.display = "block";
    document.getElementById("verifyMode").style.display = "none";

    // Show QR code
    document.getElementById("qrCodeImg").src = qrUrl;

    // Show secret for manual entry
    document.getElementById("secretDisplay").textContent = formatSecret(secret);

}

/* ========================
   SHOW VERIFY MODE
======================== */

function showVerifyMode() {

    document.getElementById("setupMode").style.display = "none";
    document.getElementById("verifyMode").style.display = "block";

}

/* ========================
   STEP 2: VERIFY 2FA CODE
======================== */

function verify2FA() {

    const code =
        document.getElementById("totpCode").value.trim();

    if (!code || code.length !== 6) {
        alert("Enter a valid 6-digit code");
        return;
    }

    // Prepare body - send tempSecret if this is first-time setup
    let body = "password=" + encodeURIComponent(storedPassword) +
        "&code=" + encodeURIComponent(code);

    if (tempSecret) {
        body += "&newSecret=" + encodeURIComponent(tempSecret);
    }

    fetch("auth2fa.php?action=verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body
    })
        .then(res => {

            if (res.ok) {
                return res.json();
            } else {
                return res.json().then(data => {
                    throw new Error(data.message || "Verification failed");
                });
            }

        })
        .then(data => {

            if (data.success) {
                // Login successful!
                document.getElementById("twoFAScreen").style.display = "none";
                document.getElementById("adminContent").style.display = "block";
                loadCodes();
            }

        })
        .catch(err => {
            console.error("2FA verification error:", err);
            alert("Invalid 2FA code. Try again.\n\n" + err.message);
        });

}

/* ========================
   GO BACK TO PASSWORD
======================== */

function goBack() {

    document.getElementById("adminPassword").value = "";
    document.getElementById("totpCode").value = "";
    document.getElementById("loginScreen").style.display = "block";
    document.getElementById("twoFAScreen").style.display = "none";

}

/* ========================
   RESET 2FA SETUP
======================== */

function reset2FA() {

    if (!confirm("Reset 2FA? You'll need to re-scan with your authenticator app.")) {
        return;
    }

    fetch("auth2fa.php?action=reset", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "password=" + encodeURIComponent(storedPassword)
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            location.reload();
        })
        .catch(err => {
            console.error("Reset error:", err);
            alert("Failed to reset 2FA");
        });

}

/* ========================
   UPLOAD VIDEO
======================== */

function uploadVideo() {

    const video =
        document.getElementById("videoFile").files[0];

    const thumbnail =
        document.getElementById("thumbnailFile").files[0];

    if (!video) {
        alert("Select a video");
        return;
    }

    if (!thumbnail) {
        alert("Select a thumbnail image");
        return;
    }

    const formData = new FormData();

    formData.append(
        "password",
        storedPassword
    );

    formData.append(
        "video",
        video
    );

    formData.append(
        "thumbnail",
        thumbnail
    );

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener(
        "progress",
        function (e) {

            if (e.lengthComputable) {

                const percent =
                    Math.round(
                        (e.loaded / e.total) * 100
                    );

                document
                    .getElementById(
                        "progressBar"
                    )
                    .style.width =
                    percent + "%";

            }

        }
    );

    xhr.onload = function () {

        alert(xhr.responseText);

        document
            .getElementById(
                "progressBar"
            )
            .style.width = "0%";

    };

    xhr.open(
        "POST",
        "upload.php"
    );

    xhr.send(formData);

}

/* ========================
   PROMO CODE MANAGEMENT
======================== */

function loadCodes() {

    fetch(
        "manage_codes.php?action=list"
    )
        .then(res => res.json())
        .then(codes => {

            const list =
                document.getElementById(
                    "codeList"
                );

            list.innerHTML = "";

            codes.forEach(code => {

                const li =
                    document.createElement("li");

                li.innerHTML =
                    code +
                    " <button onclick=\"deleteCode('" +
                    code +
                    "')\">Delete</button>";

                list.appendChild(li);

            });

        });

}

function addCode() {

    const code =
        document.getElementById("newCode").value;

    fetch(
        "manage_codes.php?action=add",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body:
                "code=" +
                encodeURIComponent(code)
        }
    )
        .then(() => {
            document.getElementById("newCode").value = "";
            loadCodes();
        });

}

function deleteCode(code) {

    fetch(
        "manage_codes.php?action=delete",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body:
                "code=" +
                encodeURIComponent(code)
        }
    )
        .then(() => loadCodes());

}

window.onload = function () {
    // Remove the alert that was in the original
    console.log("Admin dashboard loaded");
};