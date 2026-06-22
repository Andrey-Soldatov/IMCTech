import { checkAuth } from "./api/auth.js";
import { storage } from "./utils/storage.js";

const API_URL = "http://localhost:3000";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  updateSidebar(); // 🔥 Теперь async, но вызываем без await
  setupSmartBoardLink();
  setupLogoutButton();
  highlightNav();
});

// ===== ОБНОВЛЕНИЕ САЙДБАРА С РЕАЛЬНОЙ РОЛЬЮ =====
async function updateSidebar() {
  const user = storage.getCurrentUser();
  if (!user) return;

  const nameEl = document.querySelector(".user-info .name");
  const roleEl = document.querySelector(".user-info .roles");

  if (nameEl) nameEl.textContent = user.name;

  // Получаем boardId из URL
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = urlParams.get("boardId");

  if (boardId) {
    // 🔥 Загружаем реальную роль на доске через API
    try {
      const token = localStorage.getItem("imctech_token");
      const res = await fetch(`${API_URL}/api/boards/${boardId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const members = await res.json();
        const member = members.find((m) => m.user_id === user.id);

        if (member) {
          const roleLabel = member.role === "mentor" ? "Наставник" : "Студент";
          const statusLabel =
            member.status === "admin" ? " · Админ" : " · Участник";

          if (roleEl) roleEl.textContent = roleLabel + statusLabel;
          console.log(`✅ Роль на доске: ${roleLabel}${statusLabel}`);
          return;
        }
      }
    } catch (error) {
      console.warn("Не удалось загрузить роль с доски:", error);
    }
  }

  // Если нет boardId или ошибка — показываем дефолтную роль
  if (roleEl) {
    roleEl.textContent = "Пользователь";
  }
}

// ===== ПОДСВЕТКА АКТИВНОГО ПУНКТА =====
function highlightNav() {
  const currentPage = window.location.pathname.split("/").pop();

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  document.querySelectorAll(".nav-item a").forEach((link) => {
    const href = (link.getAttribute("href") || "")
      .split("?")[0]
      .split("/")
      .pop();

    if (href === currentPage) {
      link.closest(".nav-item").classList.add("active");
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
