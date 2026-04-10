/* ========================================
   GLOBAL STATE MANAGEMENT
======================================== */

let currentStep = 1;
let adminPassword = "";
let isAuthenticated = false;
let uploadData = {
    videoFile: null,
    thumbnailFile: null
};

/* ========================================
   PASSWORD VERIFICATION
======================================== */

function verifyPassword(event) {
    if (event) {
        event.preventDefault();
    }

    const password = document.getElementById("adminPassword").value;

    if (!password) {
        alert("Please enter a password");
        return false;
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
                // Clear failed attempts and recovery link
                localStorage.removeItem("passwordChangedFlag");
                document.getElementById("recoveryLinkContainer").style.display = "none";

                adminPassword = password;
                document.getElementById("loginScreen").style.display = "none";
                document.getElementById("twoFAScreen").style.display = "block";
                initiate2FA();
            } else {
                showError("Invalid password");

                // Mark that password change just happened (first failed attempt)
                if (!localStorage.getItem("passwordChangedFlag")) {
                    localStorage.setItem("passwordChangedFlag", "true");
                    // Show recovery link after a short delay
                    setTimeout(() => {
                        document.getElementById("recoveryLinkContainer").style.display = "block";
                    }, 500);
                }
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });

    return false;
}

function tryOldPassword() {
    const password = "a"; // Old/default password

    fetch("verify_password.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "password=" + encodeURIComponent(password)
    })
        .then(res => {
            if (res.ok) {
                // Clear recovery tracking
                localStorage.removeItem("passwordChangedFlag");
                document.getElementById("recoveryLinkContainer").style.display = "none";
                document.getElementById("adminPassword").value = "";

                adminPassword = password;
                document.getElementById("loginScreen").style.display = "none";
                document.getElementById("twoFAScreen").style.display = "block";
                initiate2FA();
            } else {
                showError("Recovery failed. Old password doesn't work either.");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
}

function initiate2FA() {
    fetch("auth2fa.php?action=getSecret&password=" + encodeURIComponent(adminPassword), {
        method: "GET"
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'new') {
                // First time setup - need to configure 2FA
                document.getElementById("setupMode").style.display = "block";
                document.getElementById("verifyMode").style.display = "none";
                document.getElementById("qrCodeImg").src = data.qrUrl;
                document.getElementById("secretDisplay").textContent = data.secret;

                // Store secret for verification
                window.setupSecret = data.secret;

                // Show TOTP input for verification
                document.getElementById("totpCode").focus();

                // Add Enter key handler for TOTP input
                document.getElementById("totpCode").onkeypress = function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        verify2FA();
                    }
                };
            } else if (data.status === 'exists') {
                // 2FA already configured, just need verification
                document.getElementById("setupMode").style.display = "none";
                document.getElementById("verifyMode").style.display = "block";

                // Show TOTP input for verification
                document.getElementById("totpCode").focus();

                // Add Enter key handler for TOTP input
                document.getElementById("totpCode").onkeypress = function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        verify2FA();
                    }
                };
            } else {
                showError(data.message || "Failed to get 2FA status");
                goBack();
            }
        })
        .catch(err => {
            console.error("2FA error:", err);
            showError("Server error getting 2FA status");
            goBack();
        });
}

function verify2FA() {
    const code = document.getElementById("totpCode").value.trim();

    if (code.length !== 6) {
        showError("Please enter a 6-digit code");
        return;
    }

    if (!adminPassword) {
        showError("Password not stored. Please log in again.");
        return;
    }

    const body = new URLSearchParams();
    body.append("password", adminPassword);
    body.append("code", code);

    // If this is setup mode, include the secret
    if (window.setupSecret) {
        body.append("newSecret", window.setupSecret);
    }

    fetch("auth2fa.php?action=verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Clear setup secret
                window.setupSecret = null;

                // Mark as authenticated - now reset is allowed
                isAuthenticated = true;

                document.getElementById("twoFAScreen").style.display = "none";
                document.getElementById("adminContent").style.display = "grid";

                // Reset to step 1 for upload
                currentStep = 1;
                hideAllSteps();
                document.getElementById("step1").classList.add("active");
                updateStepUI();

                // Load videos and promo codes for management screens
                loadVideos();
                loadCodes();

                showSuccess("Authentication successful!");
            } else {
                showError(data.message || "Invalid 2FA code");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error verifying 2FA");
        });
}

function goBack() {
    document.getElementById("twoFAScreen").style.display = "none";
    document.getElementById("loginScreen").style.display = "block";
    document.getElementById("adminPassword").value = "";
}

function reset2FA() {
    if (confirm("Reset 2FA setup? You'll need to set it up again on next login.")) {
        fetch("reset_2fa.php", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "password=" + encodeURIComponent(adminPassword)
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showSuccess(data.message || "2FA reset. Log in again to set up.");
                    goBack();
                } else {
                    showError(data.message || "Error resetting 2FA");
                }
            })
            .catch(err => {
                console.error("Error:", err);
                showError("Server error");
            });
    }
}

/* ========================================
   STEP NAVIGATION
======================================== */

function goToStep(stepNum) {
    // Special handling for Step 6 (Settings) - require reauthentication
    if (stepNum === 6) {
        if (!isAuthenticated) {
            showError("You must authenticate first");
            return;
        }
        // Show reauthentication modal
        showReauthModal(stepNum);
        return;
    }

    // Restrict steps 1-3: only allow going to next incomplete step or current/previous
    if (stepNum <= 3) {
        // Can only go forward to the next step in sequence
        if (stepNum > currentStep + 1) {
            return; // Block jumping ahead
        }
        // Check if previous steps are complete
        if (stepNum === 2 && !uploadData.videoFile) {
            showError("Please select a video first");
            return;
        }
        if (stepNum === 3 && !uploadData.thumbnailFile) {
            showError("Please select a thumbnail first");
            return;
        }
    }

    // Steps 4-6 are always accessible once authenticated
    hideAllSteps();
    currentStep = stepNum;
    document.getElementById("step" + stepNum).classList.add("active");
    updateStepUI();

    // Load data when switching to management steps
    if (stepNum === 4) {
        loadVideos();
    } else if (stepNum === 5) {
        loadCodes();
    }
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

    // Load videos on step 4
    if (currentStep === 4) {
        loadVideos();
    }

    // Load codes on step 5
    if (currentStep === 5) {
        loadCodes();
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
            // Steps before current are completed
            step.classList.add("completed");
        } else if (stepNum === currentStep) {
            // Current step is active
            step.classList.add("active");
        } else if (stepNum <= 3) {
            // Steps 1-3: apply strict sequential rules
            if (stepNum === 2 && !uploadData.videoFile) {
                step.classList.add("disabled");
            } else if (stepNum === 3 && !uploadData.thumbnailFile) {
                step.classList.add("disabled");
            } else if (stepNum > currentStep + 1) {
                // Can't skip ahead in upload flow
                step.classList.add("disabled");
            }
        } else {
            // Steps 4-6: always accessible (management & settings steps)
            // Don't add disabled class
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

    if (!adminPassword) {
        showError("Password not stored. Please log in again.");
        return;
    }

    console.log("Upload starting with password:", adminPassword ? "SET" : "NOT SET");

    const uploadBtn = document.getElementById("uploadBtn");
    uploadBtn.disabled = true;

    const formData = new FormData();
    formData.append("password", adminPassword);
    formData.append("video", uploadData.videoFile);
    formData.append("thumbnail", uploadData.thumbnailFile);

    const statusDiv = document.getElementById("uploadStatus");
    const progressBar = document.getElementById("progressBar");
    statusDiv.innerHTML = '<div class="statusMessage info show">🚀 Uploading your files...</div>';
    progressBar.style.width = "0%";

    // Use XMLHttpRequest to track upload progress
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            progressBar.style.width = percentComplete + "%";
            console.log("Upload progress:", percentComplete.toFixed(2) + "%");
        }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
        console.log("Upload response status:", xhr.status);
        console.log("Upload response:", xhr.responseText);

        if (xhr.status === 200) {
            try {
                const data = JSON.parse(xhr.responseText);
                if (data.success) {
                    progressBar.style.width = "100%";
                    statusDiv.innerHTML = '<div class="statusMessage success show">✅ Upload successful! Your video is now live in the gallery.</div>';

                    // Reset after 2 seconds and show option to upload another
                    setTimeout(() => {
                        resetUploadForm();
                        uploadBtn.disabled = false;
                    }, 2000);
                } else {
                    progressBar.style.width = "0%";
                    statusDiv.innerHTML = '<div class="statusMessage error show">❌ Upload failed: ' + (data.message || "Unknown error") + '</div>';
                    uploadBtn.disabled = false;
                }
            } catch (e) {
                console.error("JSON parse error:", e);
                progressBar.style.width = "0%";
                statusDiv.innerHTML = '<div class="statusMessage error show">❌ Server error. Please try again.</div>';
                uploadBtn.disabled = false;
            }
        } else {
            progressBar.style.width = "0%";
            try {
                const data = JSON.parse(xhr.responseText);
                statusDiv.innerHTML = '<div class="statusMessage error show">❌ Upload failed: ' + (data.message || "Unknown error") + '</div>';
            } catch (e) {
                statusDiv.innerHTML = '<div class="statusMessage error show">❌ Upload error: HTTP ' + xhr.status + '</div>';
            }
            uploadBtn.disabled = false;
        }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
        console.error("Upload error");
        progressBar.style.width = "0%";
        statusDiv.innerHTML = '<div class="statusMessage error show">❌ Upload failed. Please try again.</div>';
        uploadBtn.disabled = false;
    });

    // Handle abort
    xhr.addEventListener("abort", () => {
        console.error("Upload aborted");
        progressBar.style.width = "0%";
        statusDiv.innerHTML = '<div class="statusMessage error show">❌ Upload cancelled.</div>';
        uploadBtn.disabled = false;
    });

    xhr.open("POST", "upload.php", true);
    xhr.send(formData);
}

function resetUploadForm() {
    currentStep = 4;
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
    document.getElementById("step4").classList.add("active");
    updateStepUI();
    loadVideos();

    showSuccess("Ready to upload another video!");
}

/* ========================================
   VIDEO MANAGEMENT
======================================== */

function loadVideos() {
    fetch("get_videos.php")
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const list = document.getElementById("videoList");
                list.innerHTML = "";

                if (data.videos && data.videos.length > 0) {
                    data.videos.forEach(video => {
                        const li = document.createElement("li");
                        li.style.marginBottom = "15px";
                        li.style.padding = "15px";
                        li.style.background = "rgba(15, 23, 42, 0.6)";
                        li.style.borderRadius = "8px";

                        li.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: start; gap: 10px;">
                                <div style="flex: 1;">
                                    <strong>${escapeHtml(video.filename)}</strong>
                                    <div style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                                        Title: <em>${escapeHtml(video.title)}</em>
                                    </div>
                                    <div style="font-size: 12px; color: #94a3b8;">
                                        Size: ${formatFileSize(video.size)} | Thumbnail: ${video.hasThumbnail ? '✓' : '✗'}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btnPrimary" onclick="editVideoTitle('${escapeHtml(video.basename)}')" style="padding: 6px 12px; font-size: 12px;">Edit Title</button>
                                    <button class="btnDanger" onclick="deleteVideo('${escapeHtml(video.filename)}')" style="padding: 6px 12px; font-size: 12px;">Delete</button>
                                </div>
                            </div>
                        `;

                        list.appendChild(li);
                    });
                } else {
                    list.innerHTML = "<li>No videos uploaded yet.</li>";
                }
            }
        })
        .catch(err => console.error("Error:", err));
}

function editVideoTitle(basename) {
    const newTitle = prompt("Enter new title for this video:");

    if (newTitle === null) return;

    fetch("set_video_title.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "basename=" + encodeURIComponent(basename) + "&title=" + encodeURIComponent(newTitle.trim())
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showSuccess("Title updated!");
                loadVideos();
            } else {
                showError(data.message || "Error updating title");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
}

function deleteVideo(filename) {
    if (!confirm("Delete this video and its thumbnail? This cannot be undone.")) {
        return;
    }

    fetch("delete_video.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "basename=" + encodeURIComponent(filename)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showSuccess("Video deleted!");
                loadVideos();
            } else {
                showError(data.message || "Error deleting video");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
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
   SETTINGS FUNCTIONS
======================================== */

function showReauthModal(targetStep) {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.id = "reauthModal";
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    const modalContent = document.createElement("div");
    modalContent.style.cssText = `
        background: rgba(30, 41, 59, 0.95);
        border: 1px solid rgba(37, 99, 235, 0.5);
        border-radius: 16px;
        padding: 40px;
        max-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        text-align: center;
    `;

    modalContent.innerHTML = `
        <h2 style="margin-bottom: 10px; color: #f1f5f9;">🔐 Reauthentication Required</h2>
        <p style="color: #cbd5e1; margin-bottom: 25px;">Enter your 2FA code to access Settings</p>
        
        <input type="text" id="reauthCode" placeholder="000000" maxlength="6" inputmode="numeric"
            style="font-size: 20px; letter-spacing: 4px; text-align: center; width: 100%; padding: 12px; 
            border: 2px solid #2563eb; border-radius: 8px; background: rgba(15, 23, 42, 0.6); 
            color: #f1f5f9; margin-bottom: 20px; font-family: 'Courier New', monospace;">
        
        <div style="display: flex; gap: 10px;">
            <button style="flex: 1; padding: 10px; background: rgba(148, 163, 184, 0.2); 
                border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 8px; 
                color: #cbd5e1; cursor: pointer; font-weight: 600;"
                onclick="closeReauthModal()">Cancel</button>
            <button style="flex: 1; padding: 10px; background: linear-gradient(45deg, #2563eb, #06b6d4); 
                border: none; border-radius: 8px; color: white; cursor: pointer; font-weight: 600;"
                onclick="verifyReauth(${targetStep})">Verify</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Focus on input and add Enter key handler
    const reauthInput = document.getElementById("reauthCode");
    reauthInput.focus();
    reauthInput.onkeypress = function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            verifyReauth(targetStep);
        }
    };
}

function closeReauthModal() {
    const modal = document.getElementById("reauthModal");
    if (modal) {
        modal.remove();
    }
}

function verifyReauth(targetStep) {
    const code = document.getElementById("reauthCode").value.trim();

    if (code.length !== 6) {
        showError("Please enter a 6-digit code");
        return;
    }

    // Verify the code with current password
    const body = new URLSearchParams();
    body.append("password", adminPassword);
    body.append("code", code);

    fetch("auth2fa.php?action=verify", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeReauthModal();
                // Now allow access to settings
                hideAllSteps();
                currentStep = targetStep;
                document.getElementById("step" + targetStep).classList.add("active");
                updateStepUI();
                showSuccess("Access granted!");
            } else {
                showError("Invalid 2FA code");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error");
        });
}

function reset2FASetting() {
    if (!isAuthenticated) {
        showError("You must authenticate first");
        return;
    }

    if (!confirm("Reset 2FA setup? You'll need to set it up again on next login.")) {
        return;
    }

    fetch("reset_2fa.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "password=" + encodeURIComponent(adminPassword)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showSuccess(data.message || "2FA reset successfully. Log in again to set up.");
            } else {
                showError(data.message || "Error resetting 2FA");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error resetting 2FA");
        });
}

function changePassword() {
    if (!isAuthenticated) {
        showError("You must authenticate first");
        return;
    }

    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!newPassword || !confirmPassword) {
        showError("Please enter both passwords");
        return;
    }

    if (newPassword !== confirmPassword) {
        showError("Passwords do not match");
        return;
    }

    if (newPassword.length < 4) {
        showError("Password must be at least 4 characters");
        return;
    }

    fetch("change_password.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "oldPassword=" + encodeURIComponent(adminPassword) + "&newPassword=" + encodeURIComponent(newPassword)
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Update the stored password
                adminPassword = newPassword;
                document.getElementById("newPassword").value = "";
                document.getElementById("confirmPassword").value = "";
                showSuccess("Password changed successfully!");
            } else {
                showError(data.message || "Error changing password");
            }
        })
        .catch(err => {
            console.error("Error:", err);
            showError("Server error changing password");
        });
}

/* ========================================
   INITIALIZATION
======================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Initialize step UI
    updateStepUI();

    // Load videos and codes when admin content becomes visible
    // (They get loaded after successful 2FA in verify2FA function)
});
