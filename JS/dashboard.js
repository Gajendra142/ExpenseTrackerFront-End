// <------------ Toast Notification Logic ------------->

const toastContainer = document.getElementById("toast-container");
let currentToast = null;

function notify(message, type = "success", duration = 3000) {
  if (currentToast) dismissToast(currentToast);

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  if (type === "loading") {
    toast.innerHTML = `${message} <div class="loading-spinner"></div>`;
  } else {
    toast.textContent = message;
  }

  toast.addEventListener("click", () => dismissToast(toast));
  toastContainer.appendChild(toast);

  currentToast = toast;

  setTimeout(() => toast.classList.add("show"), 10);
  if (type !== "loading") setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toastElement) {
  toastElement.classList.remove("show");
  toastElement.addEventListener(
    "transitionend",
    () => {
      if (!toastElement.classList.contains("show")) {
        toastElement.remove();
        if (currentToast === toastElement) currentToast = null;
      }
    }, {
      once: true,
    }
  );
}

// --- Navbar Auth Button ---
const authBtn = document.querySelector(".sign-up");

function updateAuthButton() {
  const token = localStorage.getItem("accessToken");
  if (token) {
    authBtn.textContent = "Logout";
    authBtn.onclick = handleLogout;
  } else {
    authBtn.textContent = "Sign up";
    authBtn.onclick = () => (window.location.href = "auth.html");
  }
}

function handleLogout() {
  const refreshToken = localStorage.getItem("refreshToken");
  notify("Logging out...", "loading");

  fetch("https://expensetrackrio.up.railway.app/auth/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
    }),
  }).finally(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userInfo");
    notify("Logged out successfully", "success");
    updateAuthButton();
    setTimeout(() => (window.location.href = "index.html"), 1200);
  });
}

updateAuthButton();

// =================== Token Refresh Logic ===================

let isRefreshing = false;
let failedRefreshPromise = null;

async function refreshAccessToken() {
  if (isRefreshing) {
    if (failedRefreshPromise) {
      return await failedRefreshPromise;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
    return await refreshAccessToken();
  }

  isRefreshing = true;
  failedRefreshPromise = null;
  const refreshToken = localStorage.getItem("refreshToken");

  if (!refreshToken) {
    console.error("No refresh token found.");
    isRefreshing = false;
    return false;
  }

  try {
    const res = await fetch("https://expensetrackrio.up.railway.app/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!res.ok) {
      console.error("Failed to refresh token:", res.status, res.statusText);
      isRefreshing = false;
      failedRefreshPromise = Promise.resolve(false);
      return false;
    }

    const data = await res.json();
    console.log("Refresh response:", data);

    if (data.newAccessToken) {
      localStorage.setItem("accessToken", data.newAccessToken);
      isRefreshing = false;
      return true;
    }
    isRefreshing = false;
    return false;
  } catch (err) {
    console.error("Error refreshing token:", err);
    isRefreshing = false;
    failedRefreshPromise = Promise.resolve(false);
    return false;
  }
}

async function fetchWithAuth(url, options = {}) {
  let token = localStorage.getItem("accessToken");
  options.headers = options.headers || {};
  options.headers["Authorization"] = `Bearer ${token}`;

  try {
    let response = await fetch(url, options);
    if (response.status === 401 || response.status === 403) {
      const refreshSuccess = await refreshAccessToken();
      if (refreshSuccess) {
        token = localStorage.getItem("accessToken");
        options.headers["Authorization"] = `Bearer ${token}`;
        const retryResponse = await fetch(url, options);
        return retryResponse;
      } else {
        notify("Session expired. Please log in again.", "error");
        handleLogout();
        throw new Error("Session expired");
      }
    }
    return response;
  } catch (err) {
    console.error("Fetch request failed:", err);
    notify("A network error occurred.", "error");
    throw err;
  }
}

// =================== Sidebar Navigation ===================
const mainContent = document.querySelector(".main-content");
document.querySelectorAll(".side-nav li").forEach((item) => {
  item.addEventListener("click", () => {
    document
      .querySelectorAll(".side-nav li")
      .forEach((li) => li.classList.remove("active"));
    item.classList.add("active");

    const view = item.textContent.trim();
    switch (view) {
      case "Dashboard":
        renderDashboard();
        break;
      case "Expenses":
        renderExpenses();
        break;
      case "Reports":
        renderReports();
        break;
      case "Categories":
        renderCategories();
        break;
      case "Settings":
        renderSettings();
        break;
    }
  });
});

// =================== DASHBOARD ===================
async function renderDashboard() {
  mainContent.innerHTML = `
      <section class="dashboard fade-in">
        <h1 class="title">Dashboard</h1>
        <div class="summary-cards">
          <div class="card"><h2>Total Balance</h2><p id="total-balance">₹0.00</p></div>
          <div class="card"><h2>Total Income</h2><p id="total-income">₹0.00</p></div>
          <div class="card"><h2>Total Expenses</h2><p id="total-expenses">₹0.00</p></div>
        </div>
        <div class="chart-container">
          <h2>Monthly Spending & Categories</h2>
          <canvas id="monthlyChart"></canvas>
        </div>
        <div class="recent-transactions">
          <h2>Transaction History</h2>
          <div class="transaction-controls">
            <input type="text" id="transaction-search" placeholder="Search transactions...">
            <select id="transaction-sort">
              <option value="expenseDate,desc">Sort by Date (Newest)</option>
              <option value="expenseDate,asc">Sort by Date (Oldest)</option>
              <option value="amount,desc">Sort by Amount (High to Low)</option>
              <option value="amount,asc">Sort by Amount (Low to High)</option>
              <option value="category,asc">Sort by Category (A-Z)</option>
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th data-field="expenseDate">Date ⬍</th>
                <th data-field="description">Title ⬍</th>
                <th data-field="category">Category ⬍</th>
                <th data-field="amount">Amount ⬍</th>
              </tr>
            </thead>
            <tbody id="transaction-body"></tbody>
          </table>
          <div class="pagination">
            <button id="prev-page">Prev</button>
            <span id="page-info">Page 1 of ?</span>
            <button id="next-page">Next</button>
          </div>
        </div>
      </section>
    `;

  await loadSummary();
  await loadTransactions();
  await loadMonthlyChart();

  const prevButton = document.getElementById("prev-page");
  const nextButton = document.getElementById("next-page");
  const searchInput = document.getElementById("transaction-search");
  const sortSelect = document.getElementById("transaction-sort");

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (currentPage > 0) {
        currentPage--;
        loadTransactions();
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      if (!nextButton.disabled) {
        currentPage++;
        loadTransactions();
      }
    });
  }

  if (searchInput) {
    const handleSearch = debounce(() => {
      searchQuery = searchInput.value;
      currentPage = 0;
      loadTransactions();
    }, 500);

    searchInput.addEventListener("input", handleSearch);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      const [field, direction] = sortSelect.value.split(",");
      sortField = field;
      sortDir = direction;
      currentPage = 0;
      loadTransactions();
    });
  }
}

// =================== ADD EXPENSES ===================
function renderExpenses() {
  mainContent.innerHTML = `
    <section class="expenses fade-in">
      <h1>Expenses</h1>
      <form id="addExpenseForm" class="expense-form">
        <div class="form-row">
          <input type="text" name="title" placeholder="Title" required />
          <input type="number" name="amount" placeholder="Amount" required />
        </div>
        <div class="form-row">
          <select name="category" required>
            <option value="">Select Category</option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Bills">Bills</option>
            <option value="Housing">Housing</option>
            <option value="Transportation">Transportation</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Groceries">Groceries</option>
            <option value="Education">Education</option>
            <option value="Personal Care">Personal Care</option>
            <option value="Savings">Savings</option>
            <option value="Income">Income</option>
            <option value="Gifts/Donations">Gifts/Donations</option>
            <option value="Others">Others</option>
          </select>
        </div>
        <div class="form-row">
          <input type="date" name="date" required />
        </div>
        <div class="form-row">
          <textarea name="description" placeholder="Description"></textarea>
        </div>
        <div class="form-row">
          <button type="submit">Add Expense</button>
        </div>
      </form>
      <div id="expense-list">
        <p>Expenses List Loading...</p>
      </div>
    </section>
  `;

  document
    .getElementById("addExpenseForm")
    .addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const payload = {
        title: fd.get("title"),
        amount: Number(fd.get("amount")),
        category: fd.get("category"),
        expenseDate: new Date(fd.get("date")).toISOString(),
        description: fd.get("description"),
      };

      notify("Adding expense...", "loading");

      try {
        const res = await fetchWithAuth("https://expensetrackrio.up.railway.app/api/expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to add expense");

        notify("Expense added successfully", "success");
        ev.target.reset();
        loadExpenseList();
      } catch (err) {
        notify(err.message, "error");
      }
    });

  loadExpenseList();
}

async function loadExpenseList() {
  try {
    const res = await fetchWithAuth(
      "https://expensetrackrio.up.railway.app/api/expenses/filter?page=0&size=5"
    );

    if (!res.ok) throw new Error("Failed to load expenses");

    const data = await res.json();
    const listContainer = document.getElementById("expense-list");
    const expenses = Array.isArray(data.content) ? data.content : [];

    if (expenses.length === 0) {
      listContainer.innerHTML = "<p>No expenses found.</p>";
      return;
    }

    listContainer.innerHTML = `
        <div class="expense-list">
          <h2>Recent Expenses</h2>
          <ul>
            ${expenses
              .map(
                (e) => `
                <li>
                  <span class="expense-date">${new Date(
                    e.expenseDate
                  ).toLocaleDateString()}</span>
                  <span class="expense-title">${e.title}</span>
                  <span class="expense-category">${e.category}</span>
                  <span class="expense-amount">₹${e.amount}</span>
                </li>
            `
              )
              .join("")}
          </ul>
        </div>
    `;
  } catch (err) {
    notify(err.message, "error");
  }
}

// =================== REPORTS ===================
async function renderReports() {
  mainContent.innerHTML = `
      <section class="reports fade-in">
        <h1>Reports</h1>
        <div class="chart-container">
          <h2>Expenses by Category</h2>
          <canvas id="categoryChart"></canvas>
        </div>
        <div class="chart-container">
          <h2>Monthly Expenses</h2>
          <canvas id="monthlyChart"></canvas>
        </div>
        <div class="chart-container">
          <h2>Monthly Expenses by Category</h2>
          <canvas id="monthlyCategoryChart"></canvas>
        </div>
      </section>
    `;
  loadCategoryChart();
  loadMonthlyChart();
  loadMonthlyCategoryChart();
}

async function loadCategoryChart() {
  try {
    const res = await fetchWithAuth(
      "https://expensetrackrio.up.railway.app/api/reports/expenses-by-category"
    );
    if (!res.ok) throw new Error("Failed to load category data");
    const data = await res.json();
    const labels = Object.keys(data);
    const values = Object.values(data);
    const colors = [
      "#f39c12",
      "#e74c3c",
      "#2ecc71",
      "#3498db",
      "#9b59b6",
      "#1abc9c",
      "#34495e",
      "#d35400",
      "#7f8c8d",
      "#27ae60",
      "#8e44ad",
      "#2980b9",
      "#c0392b",
    ];

    const ctxCategory = document.getElementById("categoryChart").getContext("2d");
    new Chart(ctxCategory, {
      type: "pie",
      data: {
        labels,
        datasets: [{
          label: "Expenses by Category",
          data: values,
          backgroundColor: colors.slice(0, labels.length),
        }, ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            enabled: true,
          },
        },
      },
    });
  } catch (err) {
    notify(err.message, "error");
  }
}

async function loadMonthlyChart() {
  try {
    const res = await fetchWithAuth(
      "https://expensetrackrio.up.railway.app/api/reports/monthly-expenses"
    );
    if (!res.ok) throw new Error("Failed to load monthly data");
    const data = await res.json();
    const labels = Object.keys(data).sort();
    const values = labels.map((k) => data[k]);
    const ctxMonthly = document.getElementById("monthlyChart").getContext("2d");
    new Chart(ctxMonthly, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Monthly Expenses",
          data: values,
          backgroundColor: "#3775e8ff",
        }, ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  } catch (err) {
    notify(err.message, "error");
  }
}

async function loadMonthlyCategoryChart() {
  try {
    const res = await fetchWithAuth(
      "https://expensetrackrio.up.railway.app/api/reports/monthly-expenses-by-category"
    );
    if (!res.ok) throw new Error("Failed to load category data");
    const data = await res.json();

    const allMonths = new Set();
    Object.values(data).forEach(categoryData => {
      Object.keys(categoryData).forEach(month => allMonths.add(month));
    });
    const sortedMonths = Array.from(allMonths).sort();

    const colors = [
      '#f39c12', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c',
      '#34495e', '#d35400', '#7f8c8d', '#27ae60', '#8e44ad', '#2980b9'
    ];
    let colorIndex = 0;

    const datasets = Object.keys(data).map(category => {
      const categoryData = data[category];
      const categoryColor = colors[colorIndex++ % colors.length];
      const values = sortedMonths.map(month => categoryData[month] || 0);

      return {
        label: category,
        data: values,
        borderColor: categoryColor,
        backgroundColor: categoryColor + '40',
        fill: false,
        tension: 0.4, 
        pointRadius: 5, 
        pointHoverRadius: 8,
        pointBackgroundColor: categoryColor,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      };
    });

    const ctx = document.getElementById("monthlyCategoryChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: sortedMonths,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, 
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Amount (₹)',
              font: {
                size: 14
              }
            }
          },
          x: {
            title: {
              display: true,
              text: 'Month',
              font: {
                size: 14
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true // Uses a dot instead of a square for the legend
            }
          },
          title: {
            display: true,
            text: '',
            font: {
              size: 18,
              weight: 'bold'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        interaction: {
          mode: 'index',
          intersect: false,
        }
      },
    });

  } catch (err) {
    notify(err.message, "error");
  }
}

// =================== CATEGORIES ===================
function renderCategories() {
  mainContent.innerHTML = `
    <section class="categories fade-in">
      <h1>Categories</h1>
      <ul class="category-list">
        <li>Food</li>
        <li>Travel</li>
        <li>Bills</li>
        <li>Housing</li>
        <li>Transportation</li>
        <li>Healthcare</li>
        <li>Entertainment</li>
        <li>Groceries</li>
        <li>Education</li>
        <li>Personal Care</li>
        <li>Savings</li>
        <li>Gifts/Donations</li>
        <li>Others</li>
      </ul>
    </section>
  `;
}

async function loadCategoryList() {
  try {
    const res = await fetchWithAuth("https://expensetrackrio.up.railway.app/api/categories");
    if (!res.ok) throw new Error("Failed to load categories");
    const categories = await res.json();
    const categoryList = document.getElementById("category-list");
    categoryList.innerHTML = categories
      .map((cat) => `<li>${cat}</li>`)
      .join("");
  } catch (err) {
    notify(err.message, "error");
  }
}

// =================== SETTINGS ===================
async function renderSettings() {
  mainContent.innerHTML = `
      <section class="settings fade-in">
        <h1>Settings</h1>
        <form id="settings-form" class="settings-form" novalidate>
          <div class="form-group">
            <input type="text" name="username" placeholder="Username" />
            <small class="error-message username-error"></small>
          </div>
          <div class="form-group">
            <input type="email" name="email" placeholder="Email" />
            <small class="error-message email-error"></small>
          </div>
          <div class="form-group">
            <input type="file" id="image-upload" accept="image/*" />
            <small class="error-message image-error"></small>
          </div>
          <button type="submit">Save Settings</button>
        </form>
      </section>
    `;

  const form = document.getElementById("settings-form");
  const imageUpload = document.getElementById("image-upload");
  const usernameError = form.querySelector(".username-error");
  const emailError = form.querySelector(".email-error");
  const profilePic = document.querySelector(
    ".profile-container .user-profile img"
  );

  await loadSettingsForm();

  imageUpload.addEventListener("change", function () {
    const file = this.files[0];
    if (file && profilePic) {
      const reader = new FileReader();
      reader.onload = function (e) {
        profilePic.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    usernameError.textContent = "";
    emailError.textContent = "";
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const imageFile = imageUpload.files[0];
    let valid = true;

    if (!username || username.length < 3) {
      usernameError.textContent = "Username must be at least 3 characters.";
      valid = false;
    }
    if (!email || !validateEmail(email)) {
      emailError.textContent = "Please enter a valid email address.";
      valid = false;
    }
    if (!valid) return;

    const formData = new FormData();
    formData.append("username", username);
    formData.append("email", email);
    if (imageFile) {
      formData.append("profileImage", imageFile);
    }

    notify("Saving settings...", "loading");

    try {
      const res = await fetchWithAuth(
        "https://expensetrackrio.up.railway.app/api/users/profile", {
          method: "PUT",
          body: formData,
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to save settings.");
      }

      const data = await res.json();
      updateProfileDisplay(data);
      form.username.value = data.username || "";
      form.email.value = data.email || "";
      notify("Settings saved successfully", "success");
    } catch (err) {
      notify(err.message, "error");
    }
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function loadSettingsForm() {
  try {
    const res = await fetchWithAuth("https://expensetrackrio.up.railway.app/api/users/profile");
    if (!res.ok) throw new Error("Failed to load user profile.");
    const userInfo = await res.json();
    const form = document.getElementById("settings-form");

    if (form) {
      form.username.value = userInfo.username || "";
      form.email.value = userInfo.email || "";
      const profilePreview = document.getElementById("profile-preview");
      if (profilePreview && userInfo.profileImage) {
        profilePreview.src = userInfo.profileImage;
      } else if (profilePreview) {
        profilePreview.src = "https://via.placeholder.com/150";
      }
    }
    updateProfileDisplay(userInfo);
  } catch (err) {
    console.error(err);
  }
}

function updateProfileDisplay(userInfo) {
  const profilePicDisplay = document.querySelector(
    ".profile-container .user-profile img"
  );
  const usernameDisplay = document.querySelector(
    ".profile-container .user-info .username"
  );
  const emailDisplay = document.querySelector(
    ".profile-container .user-info .email"
  );

  if (profilePicDisplay && userInfo.profileImage) {
    profilePicDisplay.src = userInfo.profileImage;
  } else if (profilePicDisplay) {
    profilePicDisplay.src = "https://via.placeholder.com/150";
  }
  if (usernameDisplay && userInfo.username) {
    usernameDisplay.textContent = userInfo.username;
  }
  if (emailDisplay && userInfo.email) {
    emailDisplay.textContent = userInfo.email;
  }
}

async function loadUserProfile() {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    console.log("No access token found. User is not logged in.");
    return;
  }

  try {
    const res = await fetchWithAuth("https://expensetrackrio.up.railway.app/api/users/profile");
    if (!res.ok) {
      console.error("Failed to load user profile. Token might be invalid.");
      return;
    }
    const userInfo = await res.json();
    updateProfileDisplay(userInfo);
  } catch (err) {
    console.error("An error occurred while loading user profile:", err);
  }
}

// =================== DASHBOARD DATA ===================
async function loadSummary() {
  try {
    const res = await fetchWithAuth(
      "https://expensetrackrio.up.railway.app/api/expenses/summary"
    );
    if (!res.ok) throw new Error("Failed to fetch summary");
    const data = await res.json();
    document.getElementById("total-balance").textContent = `₹${data.balance}`;
    document.getElementById("total-income").textContent = `₹${data.income}`;
    document.getElementById("total-expenses").textContent = `₹${data.expenses}`;
  } catch (err) {
    notify(err.message, "error");
  }
}
// =================== TRANSACTIONS ===================
let currentPage = 0;
let sortField = "expenseDate";
let sortDir = "desc";
let searchQuery = "";

async function loadTransactions() {
  try {
    const res = await fetchWithAuth(
      `https://expensetrackrio.up.railway.app/api/expenses/filter?page=${currentPage}&size=10&sort=${sortField},${sortDir}&search=${searchQuery}`
    );
    if (!res.ok) throw new Error("Failed to fetch transactions");
    const data = await res.json();
    const transactions = data.content || [];
    const tbody = document.getElementById("transaction-body");
    tbody.innerHTML = "";

    if (transactions.length > 0) {
      transactions.forEach((tx) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${new Date(tx.expenseDate).toLocaleDateString()}</td>
            <td>${tx.title}</td>
            <td>${tx.category}</td>
            <td>₹${tx.amount}</td>
        `;
        tbody.appendChild(row);
      });
    } else {
      const noDataRow = document.createElement("tr");
      noDataRow.innerHTML = `<td colspan="4" class="no-data">No transactions found.</td>`;
      tbody.appendChild(noDataRow);
    }

    const prevButton = document.getElementById("prev-page");
    const nextButton = document.getElementById("next-page");
    const pageInfoSpan = document.getElementById("page-info");
    const totalPages = data.totalPages > 0 ? data.totalPages : 1;
    const currentPageNumber = data.number !== undefined && !isNaN(data.number) ?
      data.number + 1 :
      1;

    if (prevButton) prevButton.disabled = data.first;
    if (nextButton) nextButton.disabled = data.last;
    if (pageInfoSpan) {
      pageInfoSpan.textContent = `Page ${currentPageNumber} of ${totalPages}`;
    }
  } catch (err) {
    notify(err.message, "error");
  }
}

function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// =================== FADE-IN ANIMATION ====================
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
      threshold: 0.1,
    }
  );

  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

  renderDashboard();
  loadUserProfile();
});