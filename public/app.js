// public/app.js

let authHeader = "";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  
  // Check if session credentials exist
  const storedAuth = sessionStorage.getItem("visuae_auth");
  if (storedAuth) {
    authHeader = storedAuth;
    showDashboard();
  }

  // Event Listeners
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("refreshBtn").addEventListener("click", fetchStatus);
  document.getElementById("testLinesBtn").addEventListener("click", triggerSipLineTest);
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
});

// 1. Theme Management
function initTheme() {
  const current = localStorage.getItem("visuae_theme") || "dark";
  document.documentElement.setAttribute("data-theme", current);
  updateThemeButton(current);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("visuae_theme", next);
  updateThemeButton(next);
}

function updateThemeButton(theme) {
  const btn = document.getElementById("themeToggle");
  if (theme === "dark") {
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/></svg>`;
  } else {
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.3 22h-.1c-5.5 0-10-4.5-10-10C2.2 6.8 6.4 2.5 11.7 2.1c.6-.1 1.2.4 1.2 1 0 .4-.2.8-.6 1-2.4 1.4-3.8 4-3.8 6.9 0 4.4 3.6 8 8 8 2.9 0 5.5-1.5 6.9-3.8.3-.4.7-.6 1.1-.6.6 0 1.1.5 1 1.1-.4 5.3-4.8 9.5-10.1 9.5z"/></svg>`;
  }
}

// 2. Authentication Login Handling
async function handleLogin(e) {
  e.preventDefault();
  const user = document.getElementById("usernameInput").value;
  const pass = document.getElementById("passwordInput").value;
  const errorEl = document.getElementById("loginError");
  
  errorEl.textContent = "";

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user, password: pass })
    });

    if (response.ok) {
      // Create and store Basic Auth token string
      authHeader = "Basic " + btoa(user + ":" + pass);
      sessionStorage.setItem("visuae_auth", authHeader);
      
      // Reset inputs & hide login card
      document.getElementById("usernameInput").value = "";
      document.getElementById("passwordInput").value = "";
      
      showDashboard();
    } else {
      const data = await response.json();
      errorEl.textContent = data.error || "Authentication failed.";
    }
  } catch (err) {
    errorEl.textContent = "Unable to reach authentication server.";
  }
}

function showDashboard() {
  document.getElementById("loginOverlay").style.display = "none";
  document.getElementById("dashboardWrapper").style.display = "block";
  
  printConsoleLog("Session unlocked. Connected to console API.", "sys");
  
  // Perform initial status fetch
  fetchStatus();
}

function handleLogout() {
  authHeader = "";
  sessionStorage.removeItem("visuae_auth");
  
  document.getElementById("dashboardWrapper").style.display = "none";
  document.getElementById("loginOverlay").style.display = "flex";
  
  resetStatusUi();
}

function resetStatusUi() {
  const elements = ["gate-twilio", "gate-ivr", "gate-voicemail", "gate-outbound"];
  elements.forEach(id => {
    const row = document.getElementById(id);
    if (!row) return;
    const badge = row.querySelector(".status-badge");
    badge.className = "status-badge checking";
    badge.innerHTML = `<span class="status-dot"></span><span class="status-txt">Checking</span>`;
    row.querySelector(".latency-txt").textContent = "--";
  });
}

// 3. Status Fetch Scanner
async function fetchStatus() {
  printConsoleLog("Initiating endpoint diagnostics ping tests...", "sys");
  resetStatusUi();

  try {
    const response = await fetch("/api/status", {
      headers: { "Authorization": authHeader }
    });

    if (response.status === 401 || response.status === 418) {
      printConsoleLog("[SECURITY] Session expired or unauthorized. Logging out.", "err");
      handleLogout();
      return;
    }

    const data = await response.json();
    
    // Update individual rows
    updateGatewayRow("gate-twilio", data.twilio);
    updateGatewayRow("gate-ivr", data.ivr);
    updateGatewayRow("gate-voicemail", data.voicemail);
    updateGatewayRow("gate-outbound", data.outbound);

    printConsoleLog("Diagnostics check complete. All lines refreshed.", "sys");

  } catch (error) {
    printConsoleLog(`[ERROR] Failed to query status from API route: ${error.message}`, "err");
    showToast("Status refresh failed.", "error");
  }
}

function updateGatewayRow(rowId, metric) {
  const row = document.getElementById(rowId);
  if (!row || !metric) return;

  const badge = row.querySelector(".status-badge");
  const latency = row.querySelector(".latency-txt");

  let statusClass = "offline";
  let statusText = "Offline";

  if (metric.status === "online") {
    statusClass = "online";
    statusText = "Online";
  } else if (metric.status === "unauthorized") {
    statusClass = "warn";
    statusText = "Auth Error";
  }

  badge.className = `status-badge ${statusClass}`;
  badge.innerHTML = `<span class="status-dot"></span><span class="status-txt">${statusText}</span>`;
  
  latency.textContent = metric.latency;
  if (statusClass === "online") {
    latency.className = "latency-txt low";
  } else {
    latency.className = "latency-txt high";
  }

  // Print results to dev console
  const systemName = row.querySelector("h4").textContent;
  if (statusClass === "online") {
    printConsoleLog(`[OK] ${systemName} is reachable. Latency: ${metric.latency} (HTTP ${metric.statusCode})`, "ok");
  } else if (statusClass === "warn") {
    printConsoleLog(`[WARN] ${systemName} authentication failed. Set credentials in config file. (HTTP ${metric.statusCode})`, "warn");
  } else {
    printConsoleLog(`[FAIL] ${systemName} is UNREACHABLE. Target timeout or routing failed.`, "err");
  }
}

// 4. Outbound SIP Line Test Trigger
async function triggerSipLineTest() {
  const btn = document.getElementById("testLinesBtn");
  btn.setAttribute("disabled", "true");
  
  printConsoleLog("Triggering outbound call sequence to test all active SIP trunks...", "sys");
  printConsoleLog("POST /api/test-all-lines (Requesting SIP transfer Option 1)...", "info");

  try {
    const response = await fetch("/api/test-all-lines", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": authHeader
      }
    });

    const data = await response.json();

    if (response.ok) {
      printConsoleLog(`[SUCCESS] ${data.message}`, "ok");
      showToast("Outbound call placed successfully!", "success");
    } else {
      printConsoleLog(`[FAILED] Outbound call rejected: ${data.error}`, "err");
      showToast(data.error || "Failed to trigger call.", "error");
    }
  } catch (error) {
    printConsoleLog(`[ERROR] Connect failed: ${error.message}`, "err");
    showToast("Server communication error.", "error");
  } finally {
    btn.removeAttribute("disabled");
  }
}

// Console Helpers
function printConsoleLog(text, type = "sys") {
  const consoleEl = document.getElementById("consoleLogs");
  if (!consoleEl) return;

  const log = document.createElement("div");
  log.className = `console-line ${type}`;
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  log.innerHTML = `<span class="console-time">[${time}]</span> ${text}`;
  
  consoleEl.appendChild(log);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// Toast System
function showToast(message, type = "success") {
  const feed = document.getElementById("toastFeed");
  if (!feed) return;

  const toast = document.createElement("div");
  toast.className = `toast-notif ${type}`;
  toast.textContent = message;

  feed.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}
