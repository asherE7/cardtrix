/* ========================================
   GLOBAL STATE MANAGEMENT
======================================== */

let currentStep = 1;
let uploadData = {
    videoFile: null,
    thumbnailFile: null
};

/* ========================================
   PASSWORD VERIFICATION
======================================== */

function verifyPassword() {
    const password = document.getElementById("adminPassword").value;

    if (!password) {
        alert("Please enter a password");
        return;
    }

    fetch("verify_password.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "password=" + encodeURIComponent(password)
    })
        .then(res => {
            if (res.ok) {
                document.getElementById("loginScreen").style.display = "none";
                document.getElementById("twoFAScreen").style.display = "block";
                initiate2FA();
            } else {
                showError("Invalid password");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
}

/* ========================================
   2FA SETUP & VERIFICATION
======================================== */

function initiate2FA() {
    fetch("get_2fa_status.php")
        .then(res => res.json())
        .then(data => {
            if (data.needsSetup) {
                document.getElementById("setupMode").style.display = "block";
                document.getElementById("verifyMode").style.display = "none";
                document.getElementById("qrCodeImg").src = data.qrCode;
                document.getElementById("secretDisplay").textContent = data.secret;
            } else {
                document.getElementById("setupMode").style.display = "none";
                document.getElementById("verifyMode").style.display = "block";
            }
        })
        .catch(err => console.error("2FA error:", err));
}

function verify2FA() {
    const code = document.getElementById("totpCode").value.trim();

    if (code.length !== 6) {
        showError("Please enter a 6-digit code");
        return;
    }

    fetch("verify_2fa.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "code=" + encodeURIComponent(code)
    })
        .then(res => {
            if (res.ok) {
                document.getElementById("twoFAScreen").style.display = "none";
                document.getElementById("adminContent").style.display = "grid";
            } else {
                showError("Invalid 2FA code");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
}

function goBack() {
    document.getElementById("twoFAScreen").style.display = "none";
    document.getElementById("loginScreen").style.display = "block";
    document.getElementById("adminPassword").value = "";
}

function reset2FA() {
    if (confirm("Reset 2FA setup? You'll need to set it up again.")) {
        fetch("reset_2fa.php", { method: "POST" })
            .then(res => {
                if (res.ok) {
                    alert("2FA reset. Log in again to set up.");
                    goBack();
                }
            })
            .catch(err => console.error("Error:", err));
    }
}

/* ========================================
   STEP NAVIGATION
======================================== */

function goToStep(stepNum) {
    // Only allow going back to previous steps or current step
    if (stepNum > currentStep) {
        return;
    }

    hideAllSteps();
    currentStep = stepNum;
    document.getElementById("step" + stepNum).classList.add("active");
    updateStepUI();
}

function nextStep(fromStep) {
    if (fromStep === 1 && !uploadData.videoFile) {
        showError("Please select a video file");
        return;
    }
    if (fromStep === 2 && !uploadData.thumbnailFile) {
        showError("Please select a thumbnail image");
        return;
    }

    currentStep = fromStep + 1;
    hideAllSteps();
    document.getElementById("step" + currentStep).classList.add("active");
    updateStepUI();

    // Populate review section on step 3
    if (currentStep === 3) {
        populateReview();
    }
}

function prevStep(fromStep) {
    currentStep = fromStep - 1;
    hideAllSteps();
    document.getElementById("step" + currentStep).classList.add("active");
    updateStepUI();
}

function hideAllSteps() {
    document.querySelectorAll(".stepPanel").forEach(panel => {
        panel.classList.remove("active");
    });
}

function updateStepUI() {
    // Update sidebar step indicators
    const steps = document.querySelectorAll(".stepItem");

    steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove("active", "completed", "disabled");

        if (stepNum < currentStep) {
            step.classList.add("completed");
        } else if (stepNum === currentStep) {
            step.classList.add("active");
        } else {
            // Can only proceed to next step if current is complete
            if (stepNum === currentStep + 1) {
                if (uploadData.videoFile || stepNum === 1) {
                    if (uploadData.thumbnailFile || stepNum !== 3) {
                        // Allow access to next step
                    } else {
                        step.classList.add("disabled");
                    }
                } else {
                    step.classList.add("disabled");
                }
            } else {
                step.classList.add("disabled");
            }
        }
    });

    // Enable/disable buttons based on state
    if (currentStep === 1) {
        document.getElementById("nextBtn1").disabled = !uploadData.videoFile;
    } else if (currentStep === 2) {
        document.getElementById("nextBtn2").disabled = !uploadData.thumbnailFile;
    }
}

/* ========================================
   FILE HANDLING - DRAG & DROP & UPLOAD
======================================== */

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add("dragover");
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("dragover");
}

function handleDrop(e, type) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("dragover");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        if (type === "video") {
            document.getElementById("videoFile").files = files;
            handleVideoSelect({ target: { files } });
        } else if (type === "thumbnail") {
            document.getElementById("thumbnailFile").files = files;
            handleThumbnailSelect({ target: { files } });
        }
    }
}

function handleVideoSelect(e) {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file type
    const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov)$/i)) {
        showError("Please select a valid video file (MP4, WebM, or MOV)");
        return;
    }

    uploadData.videoFile = file;

    // Display file info
    const videoInfo = document.getElementById("videoInfo");
    videoInfo.innerHTML = `
        <div class="fileInfo success">
            <div>
                <strong>${escapeHtml(file.name)}</strong>
                <div class="fileSize">${formatFileSize(file.size)}</div>
            </div>
        </div>
    `;

    // Show preview
    const videoPreview = document.getElementById("videoPreview");
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.style.width = "100%";
    video.style.borderRadius = "8px";
    video.style.marginTop = "20px";
    video.controls = true;
    video.style.maxHeight = "200px";

    videoPreview.innerHTML = "";
    videoPreview.appendChild(video);

    // Enable next button
    document.getElementById("nextBtn1").disabled = false;
    updateStepUI();

    showSuccess("Video file selected successfully!");
}

function handleThumbnailSelect(e) {
    const file = e.target.files[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") || !file.type.match(/jpeg|png/)) {
        showError("Please select a valid image file (JPEG or PNG)");
        return;
    }

    uploadData.thumbnailFile = file;

    // Display file info
    const thumbnailInfo = document.getElementById("thumbnailInfo");
    thumbnailInfo.innerHTML = `
        <div class="fileInfo success">
            <div>
                <strong>${escapeHtml(file.name)}</strong>
                <div class="fileSize">${formatFileSize(file.size)}</div>
            </div>
        </div>
    `;

    // Show preview
    const thumbnailPreview = document.getElementById("thumbnailPreview");
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    img.style.marginTop = "20px";
    img.style.maxHeight = "200px";
    img.style.objectFit = "cover";

    thumbnailPreview.innerHTML = "";
    thumbnailPreview.appendChild(img);

    // Enable next button
    document.getElementById("nextBtn2").disabled = false;
    updateStepUI();

    showSuccess("Thumbnail image selected successfully!");
}

/* ========================================
   REVIEW SECTION POPULATION
======================================== */

function populateReview() {
    if (uploadData.videoFile) {
        document.getElementById("reviewVideoName").textContent = uploadData.videoFile.name;
        const videoPreview = document.getElementById("reviewVideoPreview");
        const video = document.createElement("video");
        video.src = URL.createObjectURL(uploadData.videoFile);
        video.controls = true;
        videoPreview.innerHTML = "";
        videoPreview.appendChild(video);
    }

    if (uploadData.thumbnailFile) {
        document.getElementById("reviewThumbName").textContent = uploadData.thumbnailFile.name;
        const thumbPreview = document.getElementById("reviewThumbPreview");
        const img = document.createElement("img");
        img.src = URL.createObjectURL(uploadData.thumbnailFile);
        thumbPreview.innerHTML = "";
        thumbPreview.appendChild(img);
    }
}

/* ========================================
   UPLOAD FILES
======================================== */

function uploadFiles() {
    if (!uploadData.videoFile || !uploadData.thumbnailFile) {
        showError("Please select both video and thumbnail");
        return;
    }

    const uploadBtn = document.getElementById("uploadBtn");
    uploadBtn.disabled = true;

    const formData = new FormData();
    formData.append("video", uploadData.videoFile);
    formData.append("thumbnail", uploadData.thumbnailFile);

    const statusDiv = document.getElementById("uploadStatus");
    statusDiv.innerHTML = '<div class="statusMessage info show">🚀 Uploading your files...</div>';

    fetch("upload_video.php", {
        method: "POST",
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                statusDiv.innerHTML = '<div class="statusMessage success show">✅ Upload successful! Your video is now live in the gallery.</div>';
                document.getElementById("progressBar").style.width = "100%";

                // Reset after 2 seconds and show option to upload another
                setTimeout(() => {
                    resetUploadForm();
                    uploadBtn.disabled = false;
                }, 2000);
            } else {
                statusDiv.innerHTML = '<div class="statusMessage error show">❌ Upload failed: ' + (data.message || "Unknown error") + '</div>';
                uploadBtn.disabled = false;
            }
        })
        .catch(err => {
            console.error("Upload error:", err);
            statusDiv.innerHTML = '<div class="statusMessage error show">❌ Upload error. Please try again.</div>';
            uploadBtn.disabled = false;
        });
}

function resetUploadForm() {
    currentStep = 1;
    uploadData = {
        videoFile: null,
        thumbnailFile: null
    };

    document.getElementById("videoFile").value = "";
    document.getElementById("thumbnailFile").value = "";
    document.getElementById("videoInfo").innerHTML = "";
    document.getElementById("thumbnailInfo").innerHTML = "";
    document.getElementById("videoPreview").innerHTML = "";
    document.getElementById("thumbnailPreview").innerHTML = "";
    document.getElementById("uploadStatus").innerHTML = "";
    document.getElementById("progressBar").style.width = "0%";

    hideAllSteps();
    document.getElementById("step1").classList.add("active");
    updateStepUI();

    showSuccess("Ready to upload another video!");
}

/* ========================================
   PROMO CODE MANAGEMENT
======================================== */

function addCode() {
    const code = document.getElementById("newCode").value.trim();

    if (!code) {
        showError("Please enter a promo code");
        return;
    }

    fetch("add_code.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "code=" + encodeURIComponent(code)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById("newCode").value = "";
                loadCodes();
                showSuccess("Code added successfully");
            } else {
                showError(data.message || "Error adding code");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
}

function loadCodes() {
    fetch("get_codes.php")
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("codeList");
            list.innerHTML = "";

            if (data.codes && data.codes.length > 0) {
                data.codes.forEach(code => {
                    const li = document.createElement("li");
                    li.style.marginBottom = "10px";
                    li.style.padding = "10px";
                    li.style.background = "rgba(15, 23, 42, 0.6)";
                    li.style.borderRadius = "8px";
                    li.style.display = "flex";
                    li.style.justifyContent = "space-between";
                    li.style.alignItems = "center";

                    li.innerHTML = `
                        <span><strong>${escapeHtml(code.code)}</strong> - Created: ${new Date(code.created_at).toLocaleDateString()}</span>
                        <button class="btnDanger" onclick="deleteCode('${code.code}')" style="padding: 8px 12px; font-size: 12px;">Delete</button>
                    `;

                    list.appendChild(li);
                });
            } else {
                list.innerHTML = "<li>No promo codes yet.</li>";
            }
        })
        .catch(err => console.error("Error:", err));
}

function deleteCode(code) {
    if (!confirm("Delete this code? Users won't be able to use it anymore.")) {
        return;
    }

    fetch("delete_code.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "code=" + encodeURIComponent(code)
    })
        .then(res => {
            if (res.ok) {
                loadCodes();
                showSuccess("Code deleted");
            } else {
                showError("Error deleting code");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
}

/* ========================================
   UTILITY FUNCTIONS
======================================== */

function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const div = document.createElement("div");
    div.className = "statusMessage error show";
    div.textContent = "❌ " + message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 4000);
}

function showSuccess(message) {
    const div = document.createElement("div");
    div.className = "statusMessage success show";
    div.textContent = "✓ " + message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 4000);
}

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Initialize step UI
    updateStepUI();

    // Optional: Load promo codes on admin page load
    // loadCodes();
});
