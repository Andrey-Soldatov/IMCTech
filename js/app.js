import { checkAuth } from "./api/auth.js";
import { storage } from "./utils/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  updateSidebar();
  setupSmartBoardLink();
  setupLogoutButton();
  highlightNav();
});

function updateSidebar() {
  const user = storage.getCurrentUser();
  if (!user) return;

  const nameEl = document.querySelector(".user-info .name");
  const roleEl = document.querySelector(".user-info .roles");

  // 🔥 Обрезаем имя до 5 символов
  if (nameEl) {
    let displayName = user.name || "";

    // Если имя содержит @ (email) — берём часть до @
    if (displayName.includes("@")) {
      displayName = displayName.split("@")[0];
    }

    // Обрезаем до 5 символов
    displayName = displayName.substring(0, 5);

    nameEl.textContent = displayName;
  }

  if (roleEl)
    roleEl.textContent = user.role === "admin" ? "Администратор" : "Наставник";
}

// ===== ПОДСВЕТКА АКТИВНОГО ПУНКТА =====
function highlightNav() {
  const currentPage = window.location.pathname.split("/").pop();
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("boardId");

  document.querySelectorAll(".nav-item a").forEach((link) => {
    const href = link.getAttribute("href");
    const navItem = link.closest(".nav-item");
    navItem.classList.remove("active");

    if (link.textContent.trim() === "Доска") {
      if (currentPage === "mainboard.html") {
        navItem.classList.add("active");
      }
    } else if (link.textContent.trim() === "Мои доски") {
      if (currentPage === "dashboard.html") {
        navItem.classList.add("active");
      }
    } else if (link.textContent.trim() === "Результаты") {
      if (currentPage === "results.html") {
        navItem.classList.add("active");
      }
    } else if (link.textContent.trim() === "Настройки") {
      if (currentPage === "settings.html") {
        navItem.classList.add("active");
      }
    }
  });
}

// ===== УМНАЯ ССЫЛКА "ДОСКА" =====
function setupSmartBoardLink() {
  const lastBoardId = localStorage.getItem("imctech_last_board_id");
  document.querySelectorAll(".nav-item a").forEach((link) => {
    if (link.textContent.trim() === "Доска") {
      if (lastBoardId) {
        link.href = `mainboard.html?boardId=${lastBoardId}`;
      } else {
        link.href = "dashboard.html";
      }
    }
  });
}

// ===== КНОПКА ВЫХОДА =====
function setupLogoutButton() {
  const profile = document.querySelector(".user-profile");
  if (!profile || document.getElementById("logout-btn")) return;

  if (!document.getElementById("logout-styles")) {
    const style = document.createElement("style");
    style.id = "logout-styles";
    style.textContent = `#logout-btn { margin-top: 0.75rem; width: 100%; padding: 0.55rem 0.75rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color, #2a303c); border-radius: var(--radius-md, 8px); color: var(--text-secondary, #8a919e); font-size: 0.8rem; font-weight: 500; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: all 0.2s ease; } #logout-btn:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: #ef4444; } #logout-btn svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; flex-shrink: 0; }`;
    document.head.appendChild(style);
  }

  const btn = document.createElement("button");
  btn.id = "logout-btn";
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Выйти`;
  btn.addEventListener("click", () => {
    storage.clearCurrentUser();
    window.location.href = "login.html";
  });
  profile.appendChild(btn);
}
