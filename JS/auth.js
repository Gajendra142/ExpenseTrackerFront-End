// ================== Toggle Login & Register ==================

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegister = document.getElementById("show-register");
const showLogin = document.getElementById("show-login");

// Show Register Form - Added a check to prevent errors on pages where the element doesn't exist
if (showRegister) {
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  });
}

// Show Login Form - Added a check to prevent errors on pages where the element doesn't exist
if (showLogin) {
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  });
}

function switchToLoginAfterRegister() {
  if (registerForm && loginForm) { // Added a check to ensure forms exist
    registerForm.reset();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  }
}

// ================== Toast Notification Logic ==================

const toastContainer = document.getElementById("toast-container");
let currentToast = null;

function notify(message, type = "success", duration = 3000) {
  if (currentToast) {
    dismissToast(currentToast);
  }

  if (!toastContainer) { // Exit early if toast container doesn't exist
    console.error("Toast container not found.");
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  if (type === "loading") {
    toast.innerHTML = `${message} <div class="loading-spinner"></div>`;
  } else {
    toast.textContent = message;
  }

  toast.addEventListener("click", () => {
    dismissToast(toast);
  });

  toastContainer.appendChild(toast);
  currentToast = toast;

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  if (type !== "loading") {
    setTimeout(() => {
      dismissToast(toast);
    }, duration);
  }
}

function dismissToast(toastElement) {
  toastElement.classList.remove("show");
  toastElement.addEventListener(
    "transitionend",
    () => {
      if (!toastElement.classList.contains("show")) {
        toastElement.remove();
        if (currentToast === toastElement) {
          currentToast = null;
        }
      }
    },
    { once: true }
  );
}

// ================== Navbar Auth Button Status and Logout Handling =================

const authBtn = document.querySelector(".sign-up");

async function updateNavbarAuthState() {
  if (!authBtn) return; // Added a check to prevent errors if the button doesn't exist
  const token = await getValidAccessToken();

  if (token) {
    authBtn.textContent = "Logout";
    authBtn.onclick = handleLogout;
  } else {
    authBtn.textContent = "Sign up";
    authBtn.onclick = () => (window.location.href = "auth.html");
  }
}

async function handleLogout() {
  const refreshToken = getRefreshToken();
  notify("Logging out...", "loading");

  try {
    if (refreshToken) {
      const res = await fetch("http://localhost:8080/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken }),
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

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch("http://localhost:8080/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      saveTokens(data);
      return data.accessToken;
    } else {
      const errorText = await res.text();
      console.error("Token refresh failed:", res.status, errorText);
      clearTokens();
      return null;
    }
  } catch (err) {
    console.error("Refresh failed:", err);
    clearTokens();
    return null;
  }
}

async function getValidAccessToken() {
  let token = getAccessToken();
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Date.now() / 1000;

    if (payload.exp < now) {
      console.log("Access token expired. Refreshing...");
      token = await refreshAccessToken();
    }
  } catch (e) {
    console.warn("Invalid access token found. Clearing tokens.", e);
    clearTokens();
    token = null;
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
    loginPasswordError.textContent =
      "Password must be at least 6 characters.";
    return false;
  } else {
    loginPasswordError.textContent = "";
    return true;
  }
}

if (loginEmail) { // Check before adding listener
  loginEmail.addEventListener("blur", validateLoginEmail);
}
if (loginPassword) { // Check before adding listener
  loginPassword.addEventListener("blur", validateLoginPassword);
}

if (loginForm) { // Check before adding listener
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const validEmail = validateLoginEmail();
    const validPass = validateLoginPassword();
    if (!(validEmail && validPass)) return;

    const loginData = {
      email: loginEmail.value.trim(),
      password: loginPassword.value.trim(),
    };

    notify("Logging in...", "loading");

    try {
      const res = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      if (res.ok) {
        const data = await res.json();
        saveTokens(data);
        notify("Login successful!", "success");
        loginForm.reset();
        updateNavbarAuthState();
        window.location.href = "dashboard.html";
      } else {
        const err = await res.json();
        notify("Invalid credentials.", "error");
      }
    } catch (err) {
      notify("Could not connect to server!", "error");
    }
  });
}

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
    regPasswordError.textContent =
      "Password must be at least 6 characters.";
    return false;
  } else {
    regPasswordError.textContent = "";
    return true;
  }
}

function validateRegConfirmPassword() {
  const password = regPassword.value.trim();
  const confirmPassword = regConfirmPassword.value.trim();
  if (confirmPassword === "") {
    regConfirmError.textContent = "Please confirm your password.";
    return false;
  } else if (confirmPassword !== password) {
    regConfirmError.textContent = "Passwords do not match.";
    return false;
  } else {
    regConfirmError.textContent = "";
    return true;
  }
}

if (regName) { // Check before adding listener
  regName.addEventListener("blur", validateRegName);
}
if (regEmail) { // Check before adding listener
  regEmail.addEventListener("blur", validateRegEmail);
}
if (regPassword) { // Check before adding listener
  regPassword.addEventListener("blur", validateRegPassword);
}
if (regConfirmPassword) { // Check before adding listener
  regConfirmPassword.addEventListener("blur", validateRegConfirmPassword);
}

// ================== OTP Logic ==================

const sendOtpBtn = document.getElementById("send-otp-btn");
const verifyOtpBtn = document.getElementById("verify-otp-btn");
const otpInput = document.getElementById("otp-input");
let isOtpVerified = false;

if (sendOtpBtn) { // Check before adding listener
  sendOtpBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    const email = regEmail.value.trim();
    if (!email) {
      notify("Please enter a valid email address.", "error");
      return;
    }

    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = "Sending...";

    try {
      const response = await fetch("http://localhost:8080/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        notify("OTP sent successfully! Please check your email.", "success");
        // This line can cause an error if the element doesn't exist
        const otpSection = document.getElementById("otp-section");
        if (otpSection) {
          otpSection.classList.remove("hidden");
        }
        if (verifyOtpBtn) {
          verifyOtpBtn.style.display = "inline-block";
        }
      } else {
        const error = await response.text();
        notify(`Failed to send OTP: ${error}`, "error");
      }
    } catch (error) {
      console.error("Error sending OTP: ", error);
      // notify("An error occurred while sending the OTP.", "error");
    } finally {
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = "Send OTP";
    }
  });
}

if (verifyOtpBtn) { // Check before adding listener
  verifyOtpBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    const otp = otpInput.value.trim();
    const email = regEmail.value.trim();

    if (!otp) {
      notify("Please enter the OTP.", "error");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
      });

      if (response.ok) {
        isOtpVerified = true;
        verifyOtpBtn.disabled = true;
        verifyOtpBtn.textContent = "OTP Verified";
        notify("OTP verified successfully!", "success");
      } else {
        const error = await response.text();
        notify(`OTP verification failed: ${error}`, "error");
      }
    } catch (error) {
      console.error("Error verifying OTP: ", error);
      notify("An error occurred while verifying the OTP.", "error");
    }
  });
}

if (registerForm) { // Check before adding listener
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const validName = validateRegName();
    const validEmail = validateRegEmail();
    const validPass = validateRegPassword();
    const validConfirm = validateRegConfirmPassword();

    if (!(validName && validEmail && validPass && validConfirm)) return;

    if (!isOtpVerified) {
      notify("Please verify your OTP before registering.", "error");
      return;
    }

    const regData = {
      name: regName.value.trim(),
      email: regEmail.value.trim(),
      password: regPassword.value.trim(),
    };

    notify("Registering...", "loading");

    try {
      const res = await fetch("http://localhost:8080/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(regData),
      });

      if (res.ok) {
        const data = await res.json();
        saveTokens(data);
        notify("Registration successful!", "success");
        switchToLoginAfterRegister();
      } else {
        const err = await res.json();
        notify(`Registration failed: ${err.message}`, "error");
      }
    } catch (err) {
      notify("Could not connect to server. Please try again.", "error");
    }
  });
}

// ================= Observer Animation =================

document.addEventListener("DOMContentLoaded", () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("show");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2
    }
  );

  document.querySelectorAll(".fade-in").forEach((el) => {
    observer.observe(el);
  });
});
// ==================== Forgot Password & Reset Password ======================

const forgotPasswordForm = document.getElementById("forgot-password-form");
const resetForm = document.getElementById("reset-form");

const forgotEmailInput = document.getElementById("forgot-email");
const resetPasswordInput = document.getElementById("reset-password");
const resetConfirmInput = document.getElementById("reset-confirm-password");

const resetPasswordError = document.getElementById("resetPasswordError");
const resetConfirmError = document.getElementById("resetConfirmError");

// ---------------- Helper: Validate email ----------------
function validateEmail(input) {
    const email = input.value.trim();
    const pattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/;
    if (email === "") {
        notify("Email is required.", "error");
        return false;
    } else if (!pattern.test(email)) {
        notify("Invalid email format.", "error");
        return false;
    }
    return true;
}

// ---------------- Get token from URL ----------------
function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("token");
}

// ---------------- Show appropriate form ----------------
document.addEventListener("DOMContentLoaded", () => {
    if (forgotPasswordForm && resetForm) {
        const token = getTokenFromURL();
        if (token) {
            forgotPasswordForm.classList.add("hidden");
            resetForm.classList.remove("hidden");
        } else {
            forgotPasswordForm.classList.remove("hidden");
            resetForm.classList.add("hidden");
        }
    }
});

// ---------------- Forgot Password Submission ----------------
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!validateEmail(forgotEmailInput)) return;

        notify("Sending reset link...", "loading");

        try {
            const res = await fetch("http://localhost:8080/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: forgotEmailInput.value.trim() }),
            });

            if (res.ok) {
                notify("Reset link sent! Check your email.", "success");
                forgotPasswordForm.reset();
            } else {
                const err = await res.text();
                notify(`Failed to send reset link: ${err}`, "error");
            }
        } catch (err) {
            console.error(err);
            notify("Could not connect to server.", "error");
        }
    });
}

// ---------------- Reset Password Submission ----------------
if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const password = resetPasswordInput.value.trim();
        const confirmPassword = resetConfirmInput.value.trim();
        const token = getTokenFromURL();

        let valid = true;
        resetPasswordError.textContent = "";
        resetConfirmError.textContent = "";

        if (!password) {
            resetPasswordError.textContent = "Password is required.";
            valid = false;
        } else if (password.length < 6) {
            resetPasswordError.textContent = "Password must be at least 6 characters.";
            valid = false;
        }

        if (!confirmPassword) {
            resetConfirmError.textContent = "Please confirm your password.";
            valid = false;
        } else if (password !== confirmPassword) {
            resetConfirmError.textContent = "Passwords do not match.";
            valid = false;
        }

        if (!valid) return;

        if (!token) {
            notify("Invalid or missing token.", "error");
            return;
        }

        notify("Resetting password...", "loading");

        try {
            const res = await fetch("http://localhost:8080/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
            });

            if (res.ok) {
                notify("Password reset successful! Redirecting to login...", "success");
                resetForm.reset();
                setTimeout(() => {
                    window.location.href = "auth.html";
                }, 1500);
            } else {
                const err = await res.text();
                notify(`Failed to reset password: ${err}`, "error");
            }
        } catch (err) {
            console.error(err);
            notify("Could not connect to server.", "error");
        }
    });
}
