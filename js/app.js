import { checkAuth } from "./api/auth.js";
import { storage } from "./utils/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  updateSidebar();
  highlightNav();
  setupSmartBoardLink();
  setupLogoutButton();
});

function updateSidebar() {
  const user = storage.getCurrentUser();
  if (!user) return;
  const nameEl = document.querySelector(".user-info .name");
  const roleEl = document.querySelector(".user-info .roles");
  if (nameEl) nameEl.textContent = user.name;
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

    // Сбрасываем все active
    navItem.classList.remove("active");

    // Особая логика для "Доска" — активна если мы на mainboard.html
    if (link.textContent.trim() === "Доска") {
      if (currentPage === "mainboard.html") {
        navItem.classList.add("active");
      }
    }
    // Для "Мои доски" — активна если на dashboard.html
    else if (link.textContent.trim() === "Мои доски") {
      if (currentPage === "dashboard.html") {
        navItem.classList.add("active");
      }
    }
    // Для остальных страниц — точное совпадение href
    else if (href === currentPage) {
      navItem.classList.add("active");
    }
  });
}

// ===== УМНАЯ ССЫЛКА "ДОСКА" =====
function setupSmartBoardLink() {
  const lastBoardId = localStorage.getItem("imctech_last_board_id");

  // Находим ссылку "Доска" по тексту, а не по href!
  document.querySelectorAll(".nav-item a").forEach((link) => {
    if (link.textContent.trim() === "Доска") {
      // Если есть последняя доска — ведём на неё
      if (lastBoardId) {
        link.href = `mainboard.html?boardId=${lastBoardId}`;
      } else {
        // Иначе ведём на dashboard (чтобы выбрать доску)
        link.href = "dashboard.html";
      }
    }
  });
}

// ===== КНОПКА ВЫХОДА =====
function setupLogoutButton() {
  const profile = document.querySelector(".user-profile");
  if (!profile || document.getElementById("logout-btn")) return;

  // Динамически вставляем стили
  if (!document.getElementById("logout-styles")) {
    const style = document.createElement("style");
    style.id = "logout-styles";
    style.textContent = `
      #logout-btn {
        margin-top: 0.75rem;
        width: 100%;
        padding: 0.55rem 0.75rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-color, #2a303c);
        border-radius: var(--radius-md, 8px);
        color: var(--text-secondary, #8a919e);
        font-size: 0.8rem;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.2s ease;
      }
      #logout-btn:hover {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        border-color: #ef4444;
      }
      #logout-btn svg {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        flex-shrink: 0;
      }
    `;
    document.head.appendChild(style);
  }

  const btn = document.createElement("button");
  btn.id = "logout-btn";
  btn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
    Выйти
  `;
  btn.addEventListener("click", () => {
    storage.clearCurrentUser();
    window.location.href = "login.html";
  });

  profile.appendChild(btn);
}
