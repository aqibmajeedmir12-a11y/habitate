/* ══════════════════════════════════════
   PROFILE.JS — User Profile Page
══════════════════════════════════════ */

async function loadProfilePage() {
    try {
        const res = await fetchAuth(`${API_BASE}/api/profile`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        document.getElementById("profile-name").value = data.name;
        document.getElementById("profile-email").value = data.email;
        document.getElementById("profile-xp").textContent = data.xp;
        document.getElementById("profile-level").textContent = data.level;

        const img = document.getElementById("profile-img");
        const placeholder = document.getElementById("profile-placeholder");

        if (data.profile_photo) {
            img.src = data.profile_photo;
            img.style.display = "block";
            placeholder.style.display = "none";

            const sidebarAvatar = document.querySelector(".user-avatar");
            if (sidebarAvatar) {
                sidebarAvatar.innerHTML = `<img src="${data.profile_photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            }
        } else {
            img.style.display = "none";
            placeholder.style.display = "flex";
            const initials = (data.name || "U").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
            placeholder.textContent = initials;

            const sidebarAvatar = document.querySelector(".user-avatar");
            if (sidebarAvatar) {
                sidebarAvatar.innerHTML = initials;
            }
        }

    } catch (err) {
        console.error("Failed to load profile:", err);
        showToast("❌ Failed to load profile");
    }
}

async function handleProfileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("⚠️ Please select an image file");
        return;
    }
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        showToast("⚠️ Image must be smaller than 2MB");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64Str = e.target.result;

        const img = document.getElementById("profile-img");
        const placeholder = document.getElementById("profile-placeholder");
        img.src = base64Str;
        img.style.display = "block";
        placeholder.style.display = "none";

        try {
            const res = await fetchAuth(`${API_BASE}/api/profile/photo`, {
                method: "POST",
                body: JSON.stringify({ photo_base64: base64Str })
            });
            if (!res.ok) throw new Error("Upload failed");

            showToast("✅ Profile photo updated");
            loadProfilePage();
        } catch (err) {
            console.error(err);
            showToast("❌ Failed to upload photo");
        }
    };
    reader.readAsDataURL(file);
}

async function saveProfile() {
    const btn = document.getElementById("btn-save-profile");
    const name = document.getElementById("profile-name").value.trim();

    if (!name) {
        showToast("⚠️ Name cannot be empty");
        return;
    }

    const origText = btn.textContent;
    btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Saving...`;
    btn.disabled = true;

    try {
        const res = await fetchAuth(`${API_BASE}/api/profile`, {
            method: "PUT",
            body: JSON.stringify({ name })
        });

        if (!res.ok) throw new Error("Update failed");

        showToast("✅ Profile updated");

        if (window.currentUser) window.currentUser.name = name;

        const uname = document.querySelector(".user-name");
        if (uname) uname.textContent = name;
        if (typeof updateGreeting === "function") updateGreeting(name);

        loadProfilePage();
    } catch (err) {
        console.error(err);
        showToast("❌ Failed to update profile");
    } finally {
        btn.textContent = origText;
        btn.disabled = false;
    }
}
