import { storage } from "../utils/storage.js";

let currentTask = null;
let currentBoardId = null;

document.addEventListener("DOMContentLoaded", () => {
  // 1. Получаем taskId из URL
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = Number(urlParams.get("taskId"));

  if (!taskId) {
    window.location.href = "dashboard.html";
    return;
  }

  // 2. Загружаем задачу
  const tasks = storage.getTasks();
  currentTask = tasks.find((t) => t.id === taskId);

  if (!currentTask) {
    alert("Задача не найдена");
    window.location.href = "dashboard.html";
    return;
  }

  currentBoardId = currentTask.boardId;

  // 3. Заполняем форму
  fillForm();

  // 4. Рендерим блоки
  renderStudentFiles();
  renderMentorComment();
  renderMentorFiles();
  renderSubtasks();
  renderActivity();
  renderDetails();

  // 5. Настраиваем обработчики
  setupFormHandlers();
  setupCheckButtons();
  setupNavigation();
});

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

  // Кнопка добавления
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

  // Обработчики чекбоксов
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
  document.getElementById("detailStatus").innerHTML = `
        <span class="status-dot status-blue"></span>
        <span>${statusMap[status]}</span>
    `;

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

  // Блок проверки — показываем только при статусе "review"
  document.getElementById("checkSection").style.display =
    status === "review" ? "flex" : "none";
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

  // Отправить на проверку
  document.getElementById("submitBtn").addEventListener("click", () => {
    currentTask.status = "review";
    statusSelect.value = "review";
    addActivity("Задача отправлена на проверку");
    saveTask();
    renderDetails();
  });

  // Прикрепить файл (студент)
  document.getElementById("attachFileBtn").addEventListener("click", () => {
    const fileName = prompt("Имя файла (например, code.py):");
    if (fileName && fileName.trim()) {
      if (!currentTask.studentFiles) currentTask.studentFiles = [];
      currentTask.studentFiles.push({
        name: fileName.trim(),
        uploadedAt: new Date().toISOString(),
      });
      addActivity(`Загружен файл: ${fileName.trim()}`);
      saveTask();
      renderStudentFiles();
    }
  });
}

// ===== КНОПКИ ПРОВЕРКИ =====
function setupCheckButtons() {
  document.getElementById("acceptBtn").addEventListener("click", () => {
    currentTask.status = "done";
    document.getElementById("taskStatus").value = "done";
    addActivity("Задача принята наставником");
    saveTask();
    renderDetails();
  });

  document.getElementById("rejectBtn").addEventListener("click", () => {
    currentTask.status = "in-progress";
    document.getElementById("taskStatus").value = "in-progress";
    addActivity("Задача возвращена на доработку");
    saveTask();
    renderDetails();
  });
}

// ===== НАВИГАЦИЯ =====
function setupNavigation() {
  document.getElementById("closeBtn").addEventListener("click", goBack);
  document.getElementById("cancelBtn").addEventListener("click", goBack);
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
  currentTask.activity.unshift({
    text,
    time: "только что",
  });
  renderActivity();
}
