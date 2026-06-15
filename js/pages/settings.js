import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";
let currentBoardId = null;
let currentUser = null;

function getToken() {
  return localStorage.getItem("imctech_token");
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  currentBoardId = Number(urlParams.get("boardId"));

  if (!currentBoardId) {
    window.location.href = "dashboard.html";
    return;
  }

  currentUser = storage.getCurrentUser();

  const board = storage.getBoards().find((b) => b.id === currentBoardId);
  const titleEl = document.querySelector(".page-title");
  if (titleEl && board) titleEl.textContent = `Настройки: ${board.name}`;

  await loadMembers();
  setupInviteForm();
  setupDeleteBoardBtn();
  setupCopyLinkBtn();
});

// ===== ЦВЕТА ДЛЯ РОЛЕЙ И СТАТУСОВ =====
const ROLE_COLORS = {
  student: {
    bg: "rgba(59, 130, 246, 0.15)",
    text: "#3b82f6",
    border: "#3b82f6",
  },
  mentor: {
    bg: "rgba(245, 158, 11, 0.15)",
    text: "#f59e0b",
    border: "#f59e0b",
  },
};

const STATUS_COLORS = {
  participant: {
    bg: "rgba(34, 197, 94, 0.15)",
    text: "#22c55e",
    border: "#22c55e",
  },
  admin: { bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "#a855f7" },
};

const ROLE_LABELS = {
  student: "Студент",
  mentor: "Наставник",
};

const STATUS_LABELS = {
  participant: "Участник",
  admin: "Админ",
};

// ===== ЗАГРУЗКА УЧАСТНИКОВ =====
async function loadMembers() {
  try {
    const res = await fetch(`${API_URL}/api/boards/${currentBoardId}/members`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("imctech_token");
        storage.clearCurrentUser();
        window.location.href = "login.html";
        return;
      }
      throw new Error("Ошибка загрузки участников");
    }

    const members = await res.json();
    console.log("✅ Участники загружены:", members);
    renderMembers(members);
  } catch (error) {
    console.error("Load members error:", error);
    showToast("Ошибка загрузки участников", "error");
  }
}

// ===== РЕНДЕРИНГ =====
function renderMembers(members) {
  const tbody = document.querySelector(".users-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const membersTitle = document.getElementById("membersTitle");
  if (membersTitle) {
    membersTitle.textContent = `Участники (${members.length})`;
  }

  if (members.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Пока нет участников</td></tr>';
    return;
  }

  members.forEach((member) => {
    const isOwner = member.user_id === currentUser?.id;
    const role = member.role || "student";
    const status = member.status || "participant";
    const userName = member.user_name || `Пользователь #${member.user_id}`;
    const userEmail = member.user_email || "unknown@example.com";

    const roleColor = ROLE_COLORS[role] || ROLE_COLORS.student;
    const statusColor = STATUS_COLORS[status] || STATUS_COLORS.participant;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div class="avatar" style="background: #6366f1; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.875rem;">
            ${userName.charAt(0).toUpperCase()}
          </div>
          <span>${userName} ${isOwner ? "(Вы)" : ""}</span>
        </div>
      </td>
      <td>${userEmail}</td>
      <td>
        <select class="role-select" data-user-id="${member.user_id}" ${isOwner ? "disabled" : ""} 
          style="padding: 0.4rem 0.6rem; border-radius: 6px; font-weight: 500; cursor: ${isOwner ? "not-allowed" : "pointer"}; 
          background: ${roleColor.bg}; color: ${roleColor.text}; border: 1px solid ${roleColor.border};">
          <option value="student" ${role === "student" ? "selected" : ""}>Студент</option>
          <option value="mentor" ${role === "mentor" ? "selected" : ""}>Наставник</option>
        </select>
      </td>
      <td>
        <select class="status-select" data-user-id="${member.user_id}" ${isOwner ? "disabled" : ""}
          style="padding: 0.4rem 0.6rem; border-radius: 6px; font-weight: 500; cursor: ${isOwner ? "not-allowed" : "pointer"};
          background: ${statusColor.bg}; color: ${statusColor.text}; border: 1px solid ${statusColor.border};">
          <option value="participant" ${status === "participant" ? "selected" : ""}>Участник</option>
          <option value="admin" ${status === "admin" ? "selected" : ""}>Админ</option>
        </select>
      </td>
      <td class="text-right">
        ${
          !isOwner
            ? `
          <button class="btn-remove" data-user-id="${member.user_id}" 
            style="background: #ef4444; color: white; border: none; padding: 0.4rem 0.9rem; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Удалить
          </button>
        `
            : ""
        }
      </td>
    `;
    tbody.appendChild(row);
  });

  // Обработчики для роли
  tbody.querySelectorAll(".role-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const userId = Number(e.target.dataset.userId);
      const newRole = e.target.value;
      await updateMember(userId, { role: newRole });
    });
  });

  // Обработчики для статуса
  tbody.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const userId = Number(e.target.dataset.userId);
      const newStatus = e.target.value;
      await updateMember(userId, { status: newStatus });
    });
  });

  // Обработчики для кнопок удаления
  tbody.querySelectorAll(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const userId = Number(e.target.dataset.userId);
      await removeMember(userId);
    });
  });
}

// ===== ОБНОВЛЕНИЕ УЧАСТНИКА =====
async function updateMember(userId, updates) {
  try {
    const res = await fetch(
      `${API_URL}/api/boards/${currentBoardId}/members/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(updates),
      },
    );

    if (!res.ok) {
      const err = await res.json();
      showToast(err.detail || "Ошибка при изменении", "error");
      return;
    }

    console.log("✅ Обновлено:", updates);
    await loadMembers();
    showToast("Изменения сохранены", "success");
  } catch (error) {
    console.error("Update error:", error);
    showToast("Ошибка сети", "error");
  }
}

// ===== УДАЛЕНИЕ УЧАСТНИКА =====
async function removeMember(userId) {
  if (!confirm("Удалить участника из доски?")) return;

  try {
    const res = await fetch(
      `${API_URL}/api/boards/${currentBoardId}/members/${userId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      },
    );

    if (!res.ok) {
      const err = await res.json();
      showToast(err.detail || "Ошибка при удалении", "error");
      return;
    }

    console.log("✅ Участник удалён");
    await loadMembers();
    showToast("Участник удалён", "success");
  } catch (error) {
    console.error("Remove member error:", error);
    showToast("Ошибка сети при удалении", "error");
  }
}

// ===== ФОРМА ПРИГЛАШЕНИЯ =====
function setupInviteForm() {
  const inviteForm = document.getElementById("inviteForm");
  if (!inviteForm) return;

  inviteForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = inviteForm.querySelector('input[type="email"]');
    const roleSelect = inviteForm.querySelectorAll("select")[0];
    const statusSelect = inviteForm.querySelectorAll("select")[1];

    const email = emailInput.value.trim();
    const role = roleSelect.value;
    const status = statusSelect.value;

    if (!email) {
      showToast("Введите email", "error");
      return;
    }

    try {
      const searchRes = await fetch(
        `${API_URL}/api/users/search?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } },
      );

      if (!searchRes.ok) throw new Error("Ошибка поиска");

      const users = await searchRes.json();
      const user = users.find((u) => u.email === email);

      if (!user) {
        showToast("Пользователь с таким email не найден", "error");
        return;
      }

      await addMember(user.id, role, status);
      emailInput.value = "";
    } catch (error) {
      console.error("Invite error:", error);
      showToast("Ошибка при приглашении", "error");
    }
  });
}

async function addMember(userId, role, status) {
  try {
    const res = await fetch(`${API_URL}/api/boards/${currentBoardId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ user_id: userId, role, status }),
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.detail || "Ошибка при добавлении", "error");
      return;
    }

    console.log("✅ Участник добавлен");
    await loadMembers();
    showToast("Участник добавлен", "success");
  } catch (error) {
    console.error("Add member error:", error);
    showToast("Ошибка сети", "error");
  }
}

// ===== УДАЛЕНИЕ ДОСКИ =====
function setupDeleteBoardBtn() {
  const deleteBtn = document.getElementById("deleteBoardBtn");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", async () => {
    if (!confirm("Удалить доску? Это действие нельзя отменить.")) return;

    try {
      const res = await fetch(`${API_URL}/api/boards/${currentBoardId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.detail || "Ошибка при удалении доски", "error");
        return;
      }

      const boards = storage.getBoards().filter((b) => b.id !== currentBoardId);
      storage.saveBoards(boards);
      const tasks = storage
        .getTasks()
        .filter((t) => t.boardId !== currentBoardId);
      storage.saveTasks(tasks);

      showToast("Доска удалена", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } catch (error) {
      console.error("Delete board error:", error);
      showToast("Ошибка сети", "error");
    }
  });
}

// ===== КОПИРОВАНИЕ ССЫЛКИ =====
function setupCopyLinkBtn() {
  const copyBtn = document.getElementById("copyLinkBtn");
  if (!copyBtn) return;

  copyBtn.addEventListener("click", () => {
    const linkInput = copyBtn.previousElementSibling;
    if (!linkInput) return;
    linkInput.select();
    document.execCommand("copy");
    showToast("Ссылка скопирована", "success");
  });
}

// ===== TOAST =====
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; background: ${
    type === "success" ? "#22c55e" : type === "error" ? "#ef4444" : "#3b82f6"
  }; color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; animation: slideIn 0.3s ease;`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }`;
  document.head.appendChild(style);
}
