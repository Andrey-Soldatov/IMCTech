import { storage } from "../utils/storage.js";

let currentBoard = null;
let currentBoardId = null;
let members = [];

document.addEventListener("DOMContentLoaded", () => {
  // 1. Получаем boardId из URL
  const urlParams = new URLSearchParams(window.location.search);
  currentBoardId = Number(urlParams.get("boardId"));

  if (!currentBoardId) {
    // Если boardId нет — берём последнюю открытую доску
    const lastId = localStorage.getItem("imctech_last_board_id");
    if (lastId) {
      window.location.href = `settings.html?boardId=${lastId}`;
    } else {
      window.location.href = "dashboard.html";
    }
    return;
  }

  // 2. Загружаем доску
  currentBoard = storage.getBoards().find((b) => b.id === currentBoardId);
  if (!currentBoard) {
    alert("Доска не найдена");
    window.location.href = "dashboard.html";
    return;
  }

  // 3. Загружаем участников
  members = storage.getBoardMembers(currentBoardId);

  // Если участников нет (старая доска) — добавляем создателя
  if (members.length === 0 && currentBoard.ownerId) {
    const owner = storage.getUsers().find((u) => u.id === currentBoard.ownerId);
    if (owner) {
      members = [
        {
          id: Date.now(),
          userId: owner.id,
          name: owner.name,
          email: owner.email,
          role: "mentor",
          status: "admin",
          isCreator: true,
          joinedAt: new Date().toISOString(),
        },
      ];
      storage.saveBoardMembers(currentBoardId, members);
    }
  }

  // 4. Рендерим
  renderMembers();
  updateMembersCount();
  setupInviteForm();
  setupTabs();
  setupSaveButton();
  setupDeleteBoard();
  setupCopyLink();
});

// ===== РЕНДЕР УЧАСТНИКОВ =====
function renderMembers() {
  const tbody = document.querySelector(".users-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  members.forEach((member) => {
    const initial = member.name
      ? member.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase()
      : "?";
    const isCreator =
      member.isCreator || member.userId === currentBoard.ownerId;

    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>
                <div class="user-cell">
                    <div class="avatar" style="background: ${getAvatarColor(member.name)}; color: white">
                        ${initial}
                    </div>
                    <div class="user-meta">
                        <span class="user-name">${member.name}</span>
                        ${isCreator ? '<span class="user-badge">Создатель</span>' : ""}
                    </div>
                </div>
            </td>
            <td class="user-email">${member.email}</td>
            <td>
                <select class="table-select role-select ${getRoleClass(member.role)}" data-member-id="${member.id}" ${isCreator ? "disabled" : ""}>
                    <option value="student" ${member.role === "student" ? "selected" : ""}>Студент</option>
                    <option value="mentor" ${member.role === "mentor" ? "selected" : ""}>Наставник</option>
                </select>
            </td>
            <td>
                <select class="table-select status-select ${getStatusClass(member.status)}" data-member-id="${member.id}" ${isCreator ? "disabled" : ""}>
                    <option value="participant" ${member.status === "participant" ? "selected" : ""}>Участник</option>
                    <option value="admin" ${member.status === "admin" ? "selected" : ""}>Администратор</option>
                </select>
            </td>
            <td class="text-right">
                ${
                  isCreator
                    ? '<button class="action-btn disabled" disabled></button>'
                    : `<button class="action-btn" data-action="remove" data-member-id="${member.id}" title="Удалить">🗑</button>`
                }
            </td>
        `;
    tbody.appendChild(tr);
  });

  // Обработчики селектов ролей
  tbody.querySelectorAll(".role-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const memberId = Number(e.target.dataset.memberId);
      const member = members.find((m) => m.id === memberId);
      if (member) {
        member.role = e.target.value;
        storage.saveBoardMembers(currentBoardId, members);
        // Обновляем класс при изменении
        e.target.className = `table-select role-select ${getRoleClass(e.target.value)}`;
      }
    });
  });

  // Обработчики селектов статусов
  tbody.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const memberId = Number(e.target.dataset.memberId);
      const member = members.find((m) => m.id === memberId);
      if (member) {
        member.status = e.target.value;
        storage.saveBoardMembers(currentBoardId, members);
        // Обновляем класс при изменении
        e.target.className = `table-select status-select ${getStatusClass(e.target.value)}`;
      }
    });
  });

  // Обработчики удаления
  tbody.querySelectorAll('[data-action="remove"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const memberId = Number(e.currentTarget.dataset.memberId);
      if (confirm("Удалить участника из доски?")) {
        storage.removeMember(currentBoardId, memberId);
        members = storage.getBoardMembers(currentBoardId);
        renderMembers();
        updateMembersCount();
      }
    });
  });
}

// Вспомогательные функции для получения классов
function getRoleClass(role) {
  if (role === "student") return "role-student";
  if (role === "mentor") return "role-mentor";
  return "";
}

function getStatusClass(status) {
  if (status === "participant") return "status-participant";
  if (status === "admin") return "status-admin";
  return "";
}

function getAvatarColor(name) {
  const colors = [
    "#4b5563",
    "#ec4899",
    "#14b8a6",
    "#a855f7",
    "#0ea5e9",
    "#f59e0b",
    "#22c55e",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function updateMemberColor(select, value) {
  select.className = "table-select";
  if (value === "mentor" || value === "admin") {
    select.classList.add(value === "mentor" ? "role-mentor" : "status-admin");
  } else if (value === "student") {
    select.classList.add("role-student");
  } else if (value === "participant") {
    select.classList.add("status-participant");
  }
}

function updateMembersCount() {
  const title = document.querySelector(".card-title");
  if (title && title.textContent.includes("Участники")) {
    title.textContent = `Участники (${members.length})`;
  }
}

// ===== ФОРМА ПРИГЛАШЕНИЯ =====
function setupInviteForm() {
  const form = document.querySelector(".invite-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const emailInput = form.querySelector('input[type="email"]');
    const roleSelect = form.querySelectorAll("select")[0];
    const statusSelect = form.querySelectorAll("select")[1];

    const email = emailInput.value.trim();
    if (!email) return;

    // Ищем пользователя в базе
    const user = storage.getUsers().find((u) => u.email === email);
    const name = user ? user.name : email.split("@")[0];

    const result = storage.addMember(currentBoardId, {
      email,
      name,
      userId: user?.id,
      role: roleSelect.value,
      status: statusSelect.value,
    });

    if (result.success) {
      emailInput.value = "";
      members = storage.getBoardMembers(currentBoardId);
      renderMembers();
      updateMembersCount();
    } else {
      alert(result.error);
    }
  });
}

// ===== ТАБЫ =====
function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });
}

// ===== КНОПКА СОХРАНЕНИЯ =====
function setupSaveButton() {
  const saveBtn = document.querySelector(".btn-primary");
  if (saveBtn && saveBtn.textContent.includes("Сохранить")) {
    saveBtn.addEventListener("click", () => {
      // Все изменения уже сохраняются автоматически при изменении селектов
      // Но можно добавить визуальную обратную связь
      const originalText = saveBtn.innerHTML;
      saveBtn.innerHTML = "✓ Сохранено";
      saveBtn.style.backgroundColor = "#22c55e";
      setTimeout(() => {
        saveBtn.innerHTML = originalText;
        saveBtn.style.backgroundColor = "";
      }, 1500);
    });
  }
}

// ===== УДАЛЕНИЕ ДОСКИ =====
function setupDeleteBoard() {
  const deleteBtn = document.querySelector(".btn-danger");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", () => {
    const currentUser = storage.getCurrentUser();
    if (!currentUser || currentBoard.ownerId !== currentUser.id) {
      alert("Удалить доску может только её создатель");
      return;
    }

    if (
      confirm(
        `Вы уверены, что хотите удалить доску "${currentBoard.name}"? Это действие нельзя отменить.`,
      )
    ) {
      storage.deleteBoard(currentBoardId);
      window.location.href = "dashboard.html";
    }
  });
}

// ===== КОПИРОВАНИЕ ССЫЛКИ =====
function setupCopyLink() {
  const copyBtn = document.querySelector('[onclick*="copyLink"]');
  if (!copyBtn) return;

  copyBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const input = copyBtn.previousElementSibling;
    if (input) {
      input.select();
      navigator.clipboard.writeText(input.value).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "✓ Скопировано";
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      });
    }
  });
}
