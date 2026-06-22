import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";
let currentTask = null;
let currentBoardId = null;
let currentUserRole = "student";
let currentUserStatus = "participant";
let boardMembers = []; // 🔥 Кэш участников доски

function getToken() {
  return localStorage.getItem("imctech_token");
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = Number(urlParams.get("taskId"));

  if (!taskId) {
    window.location.href = "dashboard.html";
    return;
  }

  const tasks = storage.getTasks();
  currentTask = tasks.find((t) => t.id === taskId);
  if (!currentTask) {
    alert("Задача не найдена");
    window.location.href = "dashboard.html";
    return;
  }

  currentBoardId = currentTask.boardId;

  // 1. Определяем роль
  await detectUserRole();
  console.log("✅ Роль определена:", currentUserRole);

  // 🔥 2. Загружаем участников доски (для выбора ответственного)
  await loadBoardMembers();

  // 3. Рендерим всё
  fillForm();
  renderStudentFiles();
  renderMentorComment();
  renderMentorFiles();
  renderSubtasks();
  renderActivity();
  renderDetails();

  // 4. Обработчики
  setupFormHandlers();
  setupCheckButtons();
  setupNavigation();

  // 5. Ролевая логика
  applyRoleBasedUI();
});

// ===== ОПРЕДЕЛЕНИЕ РОЛИ =====
async function detectUserRole() {
  if (!currentBoardId) return;
  try {
    const res = await fetch(`${API_URL}/api/boards/${currentBoardId}/members`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return;
    const members = await res.json();
    const currentUser = storage.getCurrentUser();
    const member = members.find((m) => m.user_id === currentUser?.id);

    if (member) {
      currentUserRole = member.role || "student";
      currentUserStatus = member.status || "participant";
    }
  } catch (error) {
    console.warn("Не удалось определить роль:", error);
  }
}

// 🔥 ===== ЗАГРУЗКА УЧАСТНИКОВ ДОСКИ =====
async function loadBoardMembers() {
  if (!currentBoardId) return;

  try {
    const res = await fetch(`${API_URL}/api/boards/${currentBoardId}/members`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) {
      console.error("Ошибка загрузки участников:", res.status);
      return;
    }

    boardMembers = await res.json();
    console.log("✅ Участники доски:", boardMembers);
  } catch (error) {
    console.error("Ошибка сети при загрузке участников:", error);
  }
}

// ===== РОЛЕВАЯ ЛОГИКА UI =====
function applyRoleBasedUI() {
  console.log("🎭 Применяю UI для роли:", currentUserRole);
  const isMentor = currentUserRole === "mentor";

  const studentFields = [
    "taskTitle",
    "taskStatus",
    "taskDescription",
    "submitBtn",
  ];
  const mentorFields = ["mentorComment", "checkSection"];

  if (isMentor) {
    studentFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = "none";
      }
    });
    mentorFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = "";
      }
    });
  } else {
    studentFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = "";
      }
    });
    mentorFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = "none";
      }
    });
  }

  const attachBtn = document.getElementById("attachFileBtn");
  if (attachBtn) attachBtn.style.display = "";
}

// ===== ЗАПОЛНЕНИЕ ФОРМЫ =====
function fillForm() {
  document.getElementById("taskTitle").value = currentTask.title || "";
  document.getElementById("taskStatus").value = currentTask.status || "todo";
  document.getElementById("taskDescription").value =
    currentTask.description || "";
}

// ===== ФАЙЛЫ СТУДЕНТА =====
function renderStudentFiles() {
  const list = document.getElementById("studentFilesList");
  list.innerHTML = "";
  const files = currentTask.studentFiles || [];
  if (files.length === 0) {
    list.innerHTML =
      '<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem 0;">Файлы не загружены</div>';
    return;
  }
  files.forEach((file, idx) => {
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="file-item"><div class="file-info"><span class="file-index">${idx + 1}.</span><span class="file-name">${file.name}</span></div><div class="file-actions"><button class="file-action" data-action="delete-student" data-idx="${idx}" title="Удалить"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button></div></div>`,
    );
  });
  list.querySelectorAll('[data-action="delete-student"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      currentTask.studentFiles.splice(idx, 1);
      saveTask();
      renderStudentFiles();
    });
  });
}

// ===== КОММЕНТАРИЙ НАСТАВНИКА =====
function renderMentorComment() {
  document.getElementById("mentorComment").value =
    currentTask.mentorComment || "";
}

// ===== ФАЙЛЫ НАСТАВНИКА =====
function renderMentorFiles() {
  const list = document.getElementById("mentorFilesList");
  list.innerHTML = "";
  const files = currentTask.mentorFiles || [];
  if (files.length === 0) {
    list.innerHTML =
      '<div style="color:var(--text-muted); font-size:0.85rem; padding:0.5rem 0;">Файлы не загружены</div>';
    return;
  }
  files.forEach((file, idx) => {
    list.insertAdjacentHTML(
      "beforeend",
      `<div class="file-item"><div class="file-info"><span class="file-index">${idx + 1}.</span><span class="file-name">${file.name}</span></div><div class="file-actions"><button class="file-action" data-action="delete-mentor" data-idx="${idx}" title="Удалить"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg></button></div></div>`,
    );
  });
  list.querySelectorAll('[data-action="delete-mentor"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = Number(e.currentTarget.dataset.idx);
      currentTask.mentorFiles.splice(idx, 1);
      saveTask();
      renderMentorFiles();
    });
  });
}

// ===== ПОДЗАДАЧИ =====
function renderSubtasks() {
  const container = document.getElementById("subtasksList");
  container.innerHTML = "";
  const subtasks = currentTask.subtasks || [];
  const done = subtasks.filter((s) => s.done).length;
  document.getElementById("subtasksTitle").textContent =
    `ПОДЗАДАЧИ ${done}/${subtasks.length}`;

  subtasks.forEach((subtask, idx) => {
    const label = document.createElement("label");
    label.className = "subtask" + (subtask.done ? " done" : "");
    label.innerHTML = `<input type="checkbox" class="subtask-checkbox" ${
      subtask.done ? "checked" : ""
    } data-idx="${idx}"><span class="subtask-text">${subtask.text}</span>`;
    container.appendChild(label);
  });

  if (currentUserRole !== "mentor") {
    const addBtn = document.createElement("button");
    addBtn.className = "tag-add";
    addBtn.id = "addSubtaskBtn";
    addBtn.textContent = "+";
    addBtn.style.marginTop = "0.5rem";
    addBtn.addEventListener("click", () => {
      const text = prompt("Текст подзадачи:");
      if (text && text.trim()) {
        if (!currentTask.subtasks) currentTask.subtasks = [];
        currentTask.subtasks.push({ text: text.trim(), done: false });
        saveTask();
        renderSubtasks();
      }
    });
    container.appendChild(addBtn);
  }

  container.querySelectorAll(".subtask-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.idx);
      currentTask.subtasks[idx].done = e.target.checked;
      saveTask();
      renderSubtasks();
    });
  });
}

// ===== АКТИВНОСТЬ =====
function renderActivity() {
  const container = document.getElementById("activityList");
  container.innerHTML = "";
  const activity = currentTask.activity || [];
  if (activity.length === 0) {
    container.innerHTML =
      '<div style="color:var(--text-muted); font-size:0.8rem;">Нет событий</div>';
    return;
  }
  activity.forEach((item) => {
    container.insertAdjacentHTML(
      "beforeend",
      `<div class="activity-item"><span class="activity-icon"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" /></svg></span><span class="activity-text">${item.text}</span><span class="activity-time">${item.time}</span></div>`,
    );
  });
}

// 🔥 ===== ДЕТАЛИ (СТУДЕНТЫ ВЫБИРАЮТ ОТВЕТСТВЕННОГО) =====
function renderDetails() {
  const status = currentTask.status || "todo";
  const statusMap = {
    todo: "Не начато",
    "in-progress": "В работе",
    review: "На проверке",
    done: "Готово",
  };
  document.getElementById("detailStatus").innerHTML =
    `<span class="status-dot status-blue"></span><span>${statusMap[status]}</span>`;

  const prio = currentTask.priority || "med";
  const prioMap = { high: "↑ Высокий", med: "− Средний", low: "↓ Низкий" };
  const colorMap = { high: "#f85149", med: "#d29922", low: "#3fb950" };
  document.getElementById("detailPriority").innerHTML =
    `<span style="color:${colorMap[prio]}">${prioMap[prio]}</span>`;

  document.getElementById("deadlineText").textContent =
    currentTask.dueDate || "Не указан";

  // 🔥 ОТВЕТСТВЕННЫЙ — студенты видят select, наставник только текст
  const assigneeContainer = document.getElementById("detailAssignee");
  const isStudent = currentUserRole === "student";

  if (isStudent && assigneeContainer) {
    // Студент видит выпадающий список со всеми участниками
    console.log("👥 Участники доски:", boardMembers);

    let optionsHTML = '<option value="">Не назначен</option>';
    boardMembers.forEach((member) => {
      const selected =
        currentTask.assigneeId === member.user_id ? "selected" : "";
      const memberName = member.user_name || `Пользователь #${member.user_id}`;
      optionsHTML += `<option value="${member.user_id}" ${selected}>${memberName}</option>`;
    });

    assigneeContainer.innerHTML = `
      <select id="assigneeSelect" style="width: 100%; padding: 0.5rem; background: rgba(255,255,255,0.05); color: var(--text-primary, #e2e8f0); border: 1px solid var(--border-color, #334155); border-radius: 6px; font-size: 0.9rem; cursor: pointer;">
        ${optionsHTML}
      </select>
    `;

    // Обработчик изменения select
    const select = document.getElementById("assigneeSelect");
    if (select) {
      select.addEventListener("change", async (e) => {
        const newAssigneeId = e.target.value ? Number(e.target.value) : null;
        console.log("🔄 Меняем ответственного на:", newAssigneeId);

        currentTask.assigneeId = newAssigneeId;

        // Загружаем имя ответственного
        if (newAssigneeId) {
          const member = boardMembers.find((m) => m.user_id === newAssigneeId);
          currentTask.assignee = member?.user_name || "Пользователь";
        } else {
          currentTask.assignee = null;
        }

        saveTask();

        // Отправляем на бэкенд
        try {
          const res = await fetch(`${API_URL}/api/tasks/${currentTask.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ assignee_id: newAssigneeId }),
          });

          if (!res.ok) {
            console.error("Ошибка обновления:", await res.json());
          } else {
            console.log("✅ Ответственный обновлён в БД");
          }
        } catch (error) {
          console.error("Ошибка сети:", error);
        }
      });
    }
  } else {
    // Наставник видит текст (не может менять)
    const assignee = currentTask.assignee || "Не назначен";
    const initial =
      assignee !== "Не назначен" ? assignee[0].toUpperCase() : "?";
    assigneeContainer.innerHTML = `
      <div class="avatar" id="assigneeAvatar" style="width: 24px; height: 24px; font-size: 0.65rem; background: #14b8a6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">${initial}</div>
      <span id="assigneeText" style="margin-left: 0.5rem;">${assignee}</span>
    `;
  }

  // Теги
  const tagsContainer = document.getElementById("detailTags");
  tagsContainer.innerHTML = "";
  const tags = currentTask.tags || [];
  tags.forEach((tag) => {
    tagsContainer.insertAdjacentHTML(
      "beforeend",
      `<span class="tag">${tag}</span>`,
    );
  });

  // Наставник не может добавлять теги
  if (currentUserRole !== "mentor") {
    const addTagBtn = document.createElement("button");
    addTagBtn.className = "tag-add";
    addTagBtn.id = "addTagBtn";
    addTagBtn.textContent = "+";
    addTagBtn.addEventListener("click", () => {
      const tag = prompt("Новый тег:");
      if (tag && tag.trim()) {
        if (!currentTask.tags) currentTask.tags = [];
        currentTask.tags.push(tag.trim());
        saveTask();
        renderDetails();
      }
    });
    tagsContainer.appendChild(addTagBtn);
  }
}

// ===== ОБРАБОТЧИКИ ФОРМЫ =====
function setupFormHandlers() {
  const titleInput = document.getElementById("taskTitle");
  const statusSelect = document.getElementById("taskStatus");
  const descTextarea = document.getElementById("taskDescription");
  const mentorComment = document.getElementById("mentorComment");

  [titleInput, statusSelect, descTextarea, mentorComment].forEach((el) => {
    if (el) {
      el.addEventListener("change", () => {
        currentTask.title = titleInput.value;
        currentTask.status = statusSelect.value;
        currentTask.description = descTextarea.value;
        currentTask.mentorComment = mentorComment.value;
        saveTask();
        renderDetails();
      });
    }
  });

  document.getElementById("submitBtn")?.addEventListener("click", () => {
    currentTask.status = "review";
    statusSelect.value = "review";
    addActivity("Задача отправлена на проверку");
    saveTask();
    renderDetails();
    applyRoleBasedUI();
  });

  document.getElementById("attachFileBtn")?.addEventListener("click", () => {
    const fileName = prompt("Имя файла (например, code.py):");
    if (!fileName || !fileName.trim()) return;

    const isMentor = currentUserRole === "mentor";
    const targetList = isMentor ? "mentorFiles" : "studentFiles";

    if (!currentTask[targetList]) currentTask[targetList] = [];
    currentTask[targetList].push({
      name: fileName.trim(),
      uploadedAt: new Date().toISOString(),
    });

    addActivity(
      `Загружен файл${isMentor ? " наставником" : ""}: ${fileName.trim()}`,
    );
    saveTask();

    if (isMentor) {
      renderMentorFiles();
    } else {
      renderStudentFiles();
    }
  });
}

// ===== КНОПКИ ПРОВЕРКИ =====
function setupCheckButtons() {
  document.getElementById("acceptBtn")?.addEventListener("click", async () => {
    currentTask.status = "done";
    document.getElementById("taskStatus").value = "done";
    addActivity("Задача принята наставником");
    saveTask();

    // Отправляем на бэкенд
    try {
      const res = await fetch(`${API_URL}/api/tasks/${currentTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: "done" }),
      });

      if (!res.ok) {
        console.error("Ошибка обновления статуса:", await res.json());
      } else {
        console.log("✅ Статус обновлён на done");
      }
    } catch (error) {
      console.error("Ошибка сети:", error);
    }

    renderDetails();
    applyRoleBasedUI();
  });

  document.getElementById("rejectBtn")?.addEventListener("click", async () => {
    currentTask.status = "in-progress";
    document.getElementById("taskStatus").value = "in-progress";
    addActivity("Задача возвращена на доработку");
    saveTask();

    // Отправляем на бэкенд
    try {
      const res = await fetch(`${API_URL}/api/tasks/${currentTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: "in-progress" }),
      });

      if (!res.ok) {
        console.error("Ошибка обновления статуса:", await res.json());
      } else {
        console.log("✅ Статус обновлён на in-progress");
      }
    } catch (error) {
      console.error("Ошибка сети:", error);
    }

    renderDetails();
    applyRoleBasedUI();
  });
}

// ===== НАВИГАЦИЯ =====
function setupNavigation() {
  document.getElementById("closeBtn")?.addEventListener("click", goBack);
  document.getElementById("cancelBtn")?.addEventListener("click", goBack);
}

function goBack() {
  if (currentBoardId) {
    window.location.href = `mainboard.html?boardId=${currentBoardId}`;
  } else {
    window.location.href = "dashboard.html";
  }
}

// ===== УТИЛИТЫ =====
function saveTask() {
  const tasks = storage.getTasks();
  const idx = tasks.findIndex((t) => t.id === currentTask.id);
  if (idx !== -1) {
    tasks[idx] = currentTask;
    storage.saveTasks(tasks);
  }
}

function addActivity(text) {
  if (!currentTask.activity) currentTask.activity = [];
  currentTask.activity.unshift({ text, time: "только что" });
  renderActivity();
}
