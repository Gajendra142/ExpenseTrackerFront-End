

// ================== Toggle Login & Register ==================
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegister = document.getElementById("show-register");
const showLogin = document.getElementById("show-login");

// Show Register Form
showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
});

// Show Login Form
showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
});

// After successful registration → switch to Login Form
function switchToLoginAfterRegister() {
    registerForm.reset();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
}


// =============== toast notification logic ==================

const toastContainer = document.getElementById('toast-container');
let currentToast = null; // Variable to store the currently active toast

function notify(message, type = 'success', duration = 3000) {
    // If a toast is already visible, dismiss it first
    if (currentToast) {
        dismissToast(currentToast);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    if (type === 'loading') {
        // Special case for loading toast with a spinner
        toast.innerHTML = `${message} <div class="loading-spinner"></div>`;
    } else {
        toast.textContent = message;
    }

    toast.addEventListener('click', () => {
        dismissToast(toast);
    });

    toastContainer.appendChild(toast);
    currentToast = toast; // Store reference to the new toast

    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Only set a timeout to automatically dismiss for success/error messages
    if (type !== 'loading') {
        setTimeout(() => {
            dismissToast(toast);
        }, duration);
    }
}

// dismiss toast message
function dismissToast(toastElement) {
    toastElement.classList.remove('show');
    toastElement.addEventListener('transitionend', () => {
        if (!toastElement.classList.contains('show')) {
            toastElement.remove();
            if (currentToast === toastElement) {
                currentToast = null; 
            }
        }
    }, { once: true });
}

// ================== Navbar auth button status  and Logout handling =================

const authBtn = document.querySelector(".sign-up"); // make sure button exists

async function updateNavbarAuthState() {
    // Get a valid token (refresh if expired)
    const token = await getValidAccessToken();

    if (token) {
        authBtn.textContent = "Logout";
        authBtn.onclick = handleLogout;
    } else {
        authBtn.textContent = "Sign up";
        authBtn.onclick = () => window.location.href = "auth.html";
    }
}

// Logout handler
async function handleLogout() {
    const refreshToken = getRefreshToken();
    notify("Logging out...", "loading");

    try {
        if (refreshToken) {
            const res = await fetch("http://localhost:8080/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }), // backend removing it from DB
            });

            if (!res.ok) {
                console.warn("Backend logout failed:", await res.text());
            }
        }
    } catch (err) {
        console.error("Logout request failed:", err);
    }
    clearTokens();  
    updateNavbarAuthState();
    notify("Logged out successfully!", "success");
    setTimeout(() => {
        if (!window.location.pathname.includes("index.html")) {
            window.location.href = "index.html";
        } else {
            window.location.reload();
        }
    }, 1200);
}

// --------- Call on Page Load ---------
document.addEventListener("DOMContentLoaded", () => {
    updateNavbarAuthState();
});


// ================== Helper: Token Storage ==================

function saveTokens({ accessToken, refreshToken }) {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
}

function getAccessToken() {
    return localStorage.getItem("accessToken");
}

function getRefreshToken() {
    return localStorage.getItem("refreshToken");
}

function clearTokens() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
}

// Refresh Access Token using Refresh Token
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        const res = await fetch("https://localhost:8080/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });

        if (res.ok) {
            const data = await res.json();
            saveTokens(data); // expects { accessToken, refreshToken }
            return data.accessToken;
        } else {
            clearTokens();
            return null;
        }
    } catch (err) {
        console.error("Refresh failed:", err);
        clearTokens();
        return null;
    }
}

// Get a valid access token (refresh if expired)
async function getValidAccessToken() {
    let token = getAccessToken();
    if (!token) return null;

    // Decode JWT to check expiry
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Date.now() / 1000;

    if (payload.exp < now) {
        console.log("Access token expired. Refreshing...");
        token = await refreshAccessToken();
    }

    return token;
}

// ================== Login Validation ==================
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginEmailError = document.getElementById("loginEmailError");
const loginPasswordError = document.getElementById("loginPasswordError");

function validateLoginEmail() {
    const email = loginEmail.value.trim();
    const pattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/;
    if (email === "") {
        loginEmailError.textContent = "Email is required.";
        return false;
    } else if (!pattern.test(email)) {
        loginEmailError.textContent = "Invalid email format.";
        return false;
    } else {
        loginEmailError.textContent = "";
        return true;
    }
}

function validateLoginPassword() {
    const password = loginPassword.value.trim();
    if (password === "") {
        loginPasswordError.textContent = "Password is required.";
        return false;
    } else if (password.length < 6) {
        loginPasswordError.textContent = "Password must be at least 6 characters.";
        return false;
    } else {
        loginPasswordError.textContent = "";
        return true;
    }
}

loginEmail.addEventListener("blur", validateLoginEmail);
loginPassword.addEventListener("blur", validateLoginPassword);

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const validEmail = validateLoginEmail();
    const validPass = validateLoginPassword();
    if (!(validEmail && validPass)) return;

    const loginData = {
        email: loginEmail.value.trim(),
        password: loginPassword.value.trim(),
    };

    // Show loading toast immediately after validation passes
    notify("Logging in...", "loading");

    try {
        const res = await fetch("http://localhost:8080/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(loginData),
        });

        if (res.ok) {
            const data = await res.json();
            saveTokens(data); // store accessToken + refreshToken
            notify("Login successful!", "success");
            loginForm.reset();
            updateNavbarAuthState();
            window.location.href = "dashboard.html"
        } else {
            const err = await res.json();
            notify("Invalid credentials.", "error");
        }
    } catch (err) {
        notify("Could not connect to server!", "error");
    }
});

// ================== Register Validation ==================
const regName = document.getElementById("reg-name");
const regEmail = document.getElementById("reg-email");
const regPassword = document.getElementById("reg-password");
const regConfirmPassword = document.getElementById("reg-confirm-password");

const regNameError = document.getElementById("regNameError");
const regEmailError = document.getElementById("regEmailError");
const regPasswordError = document.getElementById("regPasswordError");
const regConfirmError = document.getElementById("regConfirmError");

function validateRegName() {
    const name = regName.value.trim();
    if (name === "") {
        regNameError.textContent = "Name is required.";
        return false;
    } else if (name.length < 3) {
        regNameError.textContent = "Name must be at least 3 characters.";
        return false;
    } else {
        regNameError.textContent = "";
        return true;
    }
}

function validateRegEmail() {
    const email = regEmail.value.trim();
    const pattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/;
    if (email === "") {
        regEmailError.textContent = "Email is required.";
        return false;
    } else if (!pattern.test(email)) {
        regEmailError.textContent = "Invalid email format.";
        return false;
    } else {
        regEmailError.textContent = "";
        return true;
    }
}

function validateRegPassword() {
    const password = regPassword.value.trim();
    if (password === "") {
        regPasswordError.textContent = "Password is required.";
        return false;
    } else if (password.length < 6) {
        regPasswordError.textContent = "Password must be at least 6 characters.";
        return false;
    } else {
        regPasswordError.textContent = "";
        return true;
    }
}

function validateRegConfirmPassword() {
    const confirm = regConfirmPassword.value.trim();
    if (confirm !== regPassword.value.trim()) {
        regConfirmError.textContent = "Passwords do not match.";
        return false;
    } else {
        regConfirmError.textContent = "";
        return true;
    }
}

regName.addEventListener("blur", validateRegName);
regEmail.addEventListener("blur", validateRegEmail);
regPassword.addEventListener("blur", validateRegPassword);
regConfirmPassword.addEventListener("blur", validateRegConfirmPassword);

registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const validName = validateRegName();
    const validEmail = validateRegEmail();
    const validPass = validateRegPassword();
    const validConfirm = validateRegConfirmPassword();

    if (!(validName && validEmail && validPass && validConfirm)) return;

    const regData = {
        name: regName.value.trim(),
        email: regEmail.value.trim(),
        password: regPassword.value.trim(),
    };

    // Show loading toast immediately after validation passes
    notify("Registering...", "loading");

    try {
        const res = await fetch("http://localhost:8080/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(regData),
        });

        if (res.ok) {
            const data = await res.json();
            saveTokens(data); // store tokens immediately after register
            notify("Registration successful! ", "success");
            console.log("Registration successful, tokens saved!");
            switchToLoginAfterRegister();

        } else {
            const err = await res.json();
            notify(`Registration failed: ${err.message}`, "error");
        }
    } catch (err) {
        notify("could not connect to server. Try again.", "error");
    }
});

// ================= observer animation =================

// Intersection Observer for fade-in animation
document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.2 }
  );

  document.querySelectorAll(".fade-in").forEach((el) => {
    observer.observe(el);
  });
});
