
// ================== Toast Notification ==================
const toastContainer = document.getElementById('toast-container');
let currentToast = null;

function notify(message, type = 'success', duration = 3000) {
    if (currentToast) dismissToast(currentToast);

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    if (type === 'loading') {
        toast.innerHTML = `${message} <div class="loading-spinner"></div>`;
    } else {
        toast.textContent = message;
    }

    toast.addEventListener('click', () => dismissToast(toast));
    toastContainer.appendChild(toast);
    currentToast = toast;

    setTimeout(() => toast.classList.add('show'), 10);

    if (type !== 'loading') {
        setTimeout(() => dismissToast(toast), duration);
    }
}

function dismissToast(toastElement) {
    toastElement.classList.remove('show');
    toastElement.addEventListener('transitionend', () => {
        if (!toastElement.classList.contains('show')) {
            toastElement.remove();
            if (currentToast === toastElement) currentToast = null;
        }
    }, { once: true });
}

// ================== Token Storage Helpers ==================
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

// =============== redirecting to dashboard after authorization ============

function redirectDashboard(){
    const accessToken = getAccessToken();
    if(!accessToken){
        window.location.href = "auth.html";
        return;
    }
    window.location.href = "dashboard.html";
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
    } catch (err) {
        console.warn("Invalid token:", err);
        clearTokens();
        return null;
    }

    return token;
}

// ================== Navbar Auth Button ==================

const authBtn = document.querySelector(".sign-up");
async function updateNavbarAuthState() {
    const token = await getValidAccessToken();

    if (token) {
        authBtn.textContent = "Logout";
        authBtn.onclick = handleLogout;
    } else {
        authBtn.textContent = "Sign up";
        authBtn.onclick = () => window.location.href = "auth.html";
    }
}

// ============== handling logout =============

async function handleLogout() {
    const refreshToken = getRefreshToken();
    notify("Logging out...", "loading");

    try {
        if (refreshToken) {
            await fetch("http://localhost:8080/auth/logout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken }),
            });
        }
    } catch (err) {
        console.error("Logout failed:", err);
    }

    clearTokens();
    updateNavbarAuthState();
    notify("Logged out successfully!", "success");

    setTimeout(() => window.location.reload(), 1200);
}

// ================== "Get Started" Button Logic ==================

const getStartedBtn = document.querySelector(".get-started");

async function handleGetStarted() {
    const token = await getValidAccessToken();
    if (token) {
        window.location.href = "dashboard.html";
    } else {
        window.location.href = "auth.html";
    }
}

getStartedBtn.addEventListener("click", handleGetStarted);

// ================== Initial Page Load Logic ==================
document.addEventListener("DOMContentLoaded", () => {
    updateNavbarAuthState();
});

// ================== Contact Form Validation ==================
const contactForm = document.getElementById("contactForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const msgInput = document.getElementById("msg");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const msgError = document.getElementById("msgError");

function validateName() {
    const name = nameInput.value.trim();
    if (!name) {
        nameError.textContent = "Name is required.";
        return false;
    } else if (name.length < 3 || name.length > 20) {
        nameError.textContent = "Name must be between 3 and 20 characters.";
        return false;
    } else {
        nameError.textContent = "";
        return true;
    }
}

function validateEmail() {
    const email = emailInput.value.trim();
    const pattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/;
    if (!email) {
        emailError.textContent = "Email is required.";
        return false;
    } else if (!pattern.test(email)) {
        emailError.textContent = "Invalid email format.";
        return false;
    } else {
        emailError.textContent = "";
        return true;
    }
}

function validateMsg() {
    const msg = msgInput.value.trim();
    if (!msg) {
        msgError.textContent = "Message cannot be empty.";
        return false;
    } else if (msg.length < 10) {
        msgError.textContent = "Message must be at least 10 characters.";
        return false;
    } else {
        msgError.textContent = "";
        return true;
    }
}

nameInput.addEventListener("blur", validateName);
emailInput.addEventListener("blur", validateEmail);
msgInput.addEventListener("blur", validateMsg);

contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!(validateName() && validateEmail() && validateMsg())) {
        notify("Please fill out the form correctly.", "error");
        return;
    }

    const formData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: msgInput.value.trim(),
    };

    notify("Submitting form...", "loading");

    try {
        const response = await fetch("http://localhost:8080/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            notify("Form submitted successfully!", "success");
            contactForm.reset();
        } else {
            notify("Something went wrong. Try again.", "error");
        }
    } catch (err) {
        notify("Error: Could not connect to server.", "error");
    }
});

// ================== Newsletter ==================
const newsletterForm = document.querySelector(".newsletter-form");
const newsletterInput = newsletterForm.querySelector("input[type='email']");

newsletterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = newsletterInput.value.trim();
    const pattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/;

    if (!email) {
        notify("Email is required.", "error");
        return;
    }
    if (!pattern.test(email)) {
        notify("Invalid email format.", "error");
        return;
    }

    notify("Subscribing...", "loading");

    try {
        const response = await fetch("https://backend-api.com/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            notify("Subscribed successfully!", "success");
            newsletterForm.reset();
        } else {
            notify("Subscription failed. Try again.", "error");
        }
    } catch (err) {
        notify("Error: Could not connect to server.", "error");
    }
});

// ================== FAQ Accordion ==================
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
        faqItems.forEach(i => {
            if (i !== item) i.classList.remove('active');
        });
        item.classList.toggle('active');
    });
});

// ================== Animations ==================
document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll(".fade-in, .slide-left, .slide-right");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    elements.forEach(el => observer.observe(el));
});

// ================= Hero Text Character Animation =================

window.addEventListener("load", () => {
  const heroHeading = document.querySelector(".hero-container h2");
  const heroParagraph = document.querySelector(".hero-container p");

  // Function to split text into spans (per character, keeping spaces)
  function splitText(element) {
    const text = element.innerText;
    element.innerHTML = "";
    text.split("").forEach((char) => {
      const span = document.createElement("span");
      span.textContent = char === " " ? "\u00A0" : char; // keep spaces
      span.style.display = "inline-block";
      span.style.opacity = 0;
      element.appendChild(span);
    });
    return element.querySelectorAll("span");
  }

  const headingChars = splitText(heroHeading);
  const paragraphChars = splitText(heroParagraph);

  // Animate heading characters
  gsap.fromTo(
    headingChars,
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      y: 0,
      duration: 0.05,
      stagger: 0.05,
      ease: "power2.out",
      delay: 0.2
    }
  );

  // Animate paragraph characters (slightly delayed after heading)
  gsap.fromTo(
    paragraphChars,
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      duration: 0.04,
      stagger: 0.02,
      ease: "power2.out",
      delay: 1.2
    }
  );
});

// ============ FAQ Accordion Toggle in help-center.html ============


// Live FAQ Search
const searchInput = document.querySelector(".help-search input");
searchInput.addEventListener("input", () => {
  const filter = searchInput.value.toLowerCase();
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question").textContent.toLowerCase();
    if (question.includes(filter)) {
      item.style.display = "";
    } else {
      item.style.display = "none";
    }
  });
});
