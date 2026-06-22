import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";
let currentTask = null;
let currentBoardId = null;
let currentUserRole = "student"; // student или mentor — это ТОЛЬКО начальное значение до загрузки
let currentUserStatus = "participant"; // participant или admin — это ТОЛЬКО начальное значение до загрузки

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

  // 1. Загружаем задачу из localStorage
  const tasks = storage.getTasks();
  currentTask = tasks.find((t) => t.id === taskId);
  if (!currentTask) {
    alert("Задача не найдена");
    window.location.href = "dashboard.html";
    return;
  }

  currentBoardId = currentTask.boardId;

  // 2. Определяем роль пользователя через API
  await detectUserRole();

  // 3. Рендерим все блоки
  fillForm();
  renderStudentFiles();
  renderMentorComment();
  renderMentorFiles();
  renderSubtasks();
  renderActivity();
  renderDetails();

  // 4. Настраиваем обработчики
  setupFormHandlers();
  setupCheckButtons();
  setupNavigation();

  // 5. Применяем ролевую логику (скрываем/показываем блоки)
  applyRoleBasedUI();
});

// ===== ОПРЕДЕЛЕНИЕ РОЛИ =====
async function detectUserRole() {
  console.log("🔍 [detectUserRole] currentBoardId =", currentBoardId);

  if (!currentBoardId) {
    console.warn(
      "🔍 [detectUserRole] нет currentBoardId — остаюсь student по умолчанию",
    );
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/boards/${currentBoardId}/members`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    console.log("🔍 [detectUserRole] ответ /members:", res.status);

    if (!res.ok) {
      console.warn(
        `🔍 [detectUserRole] запрос участников провалился (HTTP ${res.status}) — остаюсь student по умолчанию`,
      );
      return;
    }

    const members = await res.json();
    const currentUser = storage.getCurrentUser();

    console.log("🔍 [detectUserRole] currentUser.id =", currentUser?.id);
    console.log("🔍 [detectUserRole] участники доски:", members);

    const member = members.find((m) => m.user_id === currentUser?.id);

    if (member) {
      currentUserRole = member.role || "student";
      currentUserStatus = member.status || "participant";
      console.log(
        `✅ [detectUserRole] найден как участник: role=${currentUserRole}, status=${currentUserStatus}`,
      );
    } else {
      console.warn(
        "⚠️ [detectUserRole] currentUser.id НЕ найден в списке участников доски — остаюсь student/participant по умолчанию. Проверь, что ты реально привязан как участник к этой доске (board_id =",
        currentBoardId,
        ")",
      );
    }
  } catch (error) {
    console.warn(
      "Не удалось определить роль, используем student по умолчанию:",
      error,
    );
  }
}

// ===== РОЛЕВАЯ ЛОГИКА UI =====
function applyRoleBasedUI() {
  console.log("🎭 Применяю UI для роли:", currentUserRole);

  const isMentor = currentUserRole === "mentor";

  // 🔥 Наставник ВИДИТ поля студента (readOnly), но не может отправлять на проверку
  const studentOnlyFields = ["submitBtn"];

  // Поля наставника
  const mentorFields = ["mentorComment", "checkSection"];

  if (isMentor) {
    // Скрываем только кнопку "Отправить на проверку"
    studentOnlyFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    // Показываем поля наставника
    mentorFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });

    // 🔥 Показываем кнопку прикрепления файла наставнику
    const attachBtn = document.getElementById("attachFileBtn");
    if (attachBtn) attachBtn.style.display = "";
  } else {
    // Студент: показываем всё своё
    studentOnlyFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "";
    });

    // Скрываем поля наставника
    mentorFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }
}

// ===== ЗАПОЛНЕНИЕ ФОРМЫ =====
function fillForm() {
  console.log("📝 [fillForm] currentTask:", currentTask);
  console.log("📝 [fillForm] title:", currentTask?.title);
  console.log("📝 [fillForm] status:", currentTask?.status);
  console.log("📝 [fillForm] description:", currentTask?.description);

  const titleInput = document.getElementById("taskTitle");
  const statusSelect = document.getElementById("taskStatus");
  const descTextarea = document.getElementById("taskDescription");

  if (titleInput) titleInput.value = currentTask.title || "";
  if (statusSelect) statusSelect.value = currentTask.status || "todo";
  if (descTextarea) descTextarea.value = currentTask.description || "";

  // 🔥 Для наставника делаем поля readOnly (видны, но нельзя менять)
  if (currentUserRole === "mentor") {
    if (titleInput) {
      titleInput.readOnly = true;
      titleInput.style.opacity = "0.8";
      titleInput.style.cursor = "default";
    }
    if (statusSelect) {
      statusSelect.disabled = true;
      statusSelect.style.opacity = "0.8";
      statusSelect.style.cursor = "default";
    }
    if (descTextarea) {
      descTextarea.readOnly = true;
      descTextarea.style.opacity = "0.8";
      descTextarea.style.cursor = "default";
    }
  }
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
      `
      <div class="file-item">
        <div class="file-info">
          <span class="file-index">${idx + 1}.</span>
          <span class="file-name">${file.name}</span>
        </div>
        <div class="file-actions">
          <button class="file-action" data-action="delete-student" data-idx="${idx}" title="Удалить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    `,
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
      `
      <div class="file-item">
        <div class="file-info">
          <span class="file-index">${idx + 1}.</span>
          <span class="file-name">${file.name}</span>
        </div>
        <div class="file-actions">
          <button class="file-action" data-action="delete-mentor" data-idx="${idx}" title="Удалить">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    `,
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
    label.innerHTML = `
      <input type="checkbox" class="subtask-checkbox" ${subtask.done ? "checked" : ""} data-idx="${idx}">
      <span class="subtask-text">${subtask.text}</span>
    `;
    container.appendChild(label);
  });

  const addBtn = document.createElement("button");
  addBtn.className = "tag-add";
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
      `
      <div class="activity-item">
        <span class="activity-icon">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </span>
        <span class="activity-text">${item.text}</span>
        <span class="activity-time">${item.time}</span>
      </div>
    `,
    );
  });
}

// ===== ДЕТАЛИ =====
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

  const assignee = currentTask.assignee || "Не назначен";
  const initial = assignee !== "Не назначен" ? assignee[0].toUpperCase() : "?";
  document.getElementById("assigneeAvatar").textContent = initial;
  document.getElementById("assigneeText").textContent = assignee;

  const tagsContainer = document.getElementById("detailTags");
  tagsContainer.innerHTML = "";
  const tags = currentTask.tags || [];
  tags.forEach((tag) => {
    tagsContainer.insertAdjacentHTML(
      "beforeend",
      `<span class="tag">${tag}</span>`,
    );
  });

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

// ===== ОБРАБОТЧИКИ ФОРМЫ =====
// ===== ОБРАБОТЧИКИ ФОРМЫ =====
function setupFormHandlers() {
  const titleInput = document.getElementById("taskTitle");
  const statusSelect = document.getElementById("taskStatus");
  const descTextarea = document.getElementById("taskDescription");
  const mentorComment = document.getElementById("mentorComment");

  // 🔥 Делаем поля readOnly для наставника
  const isMentor = currentUserRole === "mentor";

  if (isMentor) {
    if (titleInput) {
      titleInput.readOnly = true;
      titleInput.style.background = "rgba(255,255,255,0.02)";
      titleInput.style.cursor = "not-allowed";
    }
    if (statusSelect) {
      statusSelect.disabled = true;
      statusSelect.style.background = "rgba(255,255,255,0.02)";
      statusSelect.style.cursor = "not-allowed";
    }
    if (descTextarea) {
      descTextarea.readOnly = true;
      descTextarea.style.background = "rgba(255,255,255,0.02)";
      descTextarea.style.cursor = "not-allowed";
    }
  }

  [titleInput, statusSelect, descTextarea, mentorComment].forEach((el) => {
    if (el && !el.readOnly && !el.disabled) {
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

  document.getElementById("submitBtn")?.addEventListener("click", async () => {
    currentTask.status = "review";
    statusSelect.value = "review";
    addActivity("Задача отправлена на проверку");
    saveTask();

    // 🔥 ОТПРАВЛЯЕМ НА БЭКЕНД
    try {
      const res = await fetch(`${API_URL}/api/tasks/${currentTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: "review" }),
      });

      if (!res.ok) {
        console.error("Ошибка обновления статуса:", await res.json());
      } else {
        console.log("✅ Статус обновлён на review");
      }
    } catch (error) {
      console.error("Ошибка сети:", error);
    }

    renderDetails();
    applyRoleBasedUI();

    // 🔥 Показываем уведомление и возвращаемся на доску
    showToast("Задача отправлена на проверку", "success");
    setTimeout(() => {
      if (currentBoardId) {
        window.location.href = `mainboard.html?boardId=${currentBoardId}`;
      }
    }, 1000);
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

    // 🔥 Отправляем на бэкенд
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

    // 🔥 Отправляем на бэкенд
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
