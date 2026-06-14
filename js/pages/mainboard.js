import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";
let currentBoardId = null;

function getToken() {
  return localStorage.getItem("imctech_token");
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Получаем ID доски из URL
  const urlParams = new URLSearchParams(window.location.search);
  currentBoardId = Number(urlParams.get("boardId"));

  if (!currentBoardId) {
    window.location.href = "dashboard.html";
    return;
  }

  // Сохраняем ID последней открытой доски
  localStorage.setItem("imctech_last_board_id", currentBoardId);

  // Обновляем заголовок из localStorage (доски уже загружены на dashboard)
  const board = storage.getBoards().find((b) => b.id === currentBoardId);
  const titleEl = document.querySelector(".breadcrumbs .current");
  if (titleEl && board) titleEl.textContent = board.name;

  // 2. Загружаем задачи через API и рендерим
  loadAndRenderTasks();

  // 3. Настраиваем drag-and-drop
  setupDragAndDrop();

  // 4. Обработчики кнопок "Добавить задачу"
  document.querySelectorAll(".add-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const column = btn.closest(".column");
      const status = getStatusFromColumn(column);
      openTaskModal(null, currentBoardId, status);
    });
  });

  // 5. Настраиваем модальное окно
  setupModalHandlers();
});

// ===== ЗАГРУЗКА ЗАДАЧ ЧЕРЕЗ API =====
async function loadAndRenderTasks() {
  try {
    const res = await fetch(`${API_URL}/api/boards/${currentBoardId}/tasks`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        localStorage.removeItem("imctech_token");
        storage.clearCurrentUser();
        window.location.href = "login.html";
        return;
      }
      throw new Error("Ошибка загрузки задач");
    }

    const apiTasks = await res.json();
    console.log("✅ Задачи загружены:", apiTasks.length);

    // Маппим данные из API в формат localStorage для совместимости
    const currentUser = storage.getCurrentUser();
    const localTasks = apiTasks.map((task) => ({
      id: task.id,
      boardId: task.board_id,
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date || "",
      assignee:
        currentUser && task.assignee_id === currentUser.id
          ? currentUser.name
          : null,
      assigneeId: task.assignee_id,
      tags: [], // Пока нет в API
      studentFiles: [], // Пока нет в API
      mentorFiles: [], // Пока нет в API
      mentorComment: "", // Пока нет в API
      subtasks: [], // Пока нет в API
      activity: [], // Пока нет в API
      createdAt: new Date().toISOString(),
    }));

    // Сохраняем в localStorage для task-result.js, results.js
    storage.saveTasks(localTasks);

    // Рендерим
    renderTasks(currentBoardId);
  } catch (error) {
    console.error("Load tasks error:", error);
    // Фоллбэк на localStorage
    renderTasks(currentBoardId);
  }
}

// ===== РЕНДЕРИНГ =====
function renderTasks(boardId) {
  const allTasks = storage.getTasks();
  const boardTasks = allTasks.filter((t) => t.boardId === boardId);

  // Очищаем колонки (оставляем только кнопки "Добавить")
  document.querySelectorAll(".column-body").forEach((body) => {
    const btn = body.querySelector(".add-task-btn");
    body.innerHTML = "";
    if (btn) body.appendChild(btn);
  });

  // Раскидываем задачи
  boardTasks.forEach((task) => {
    const column = getColumnByStatus(task.status);
    if (column) {
      const card = createTaskCard(task);
      const btn = column.querySelector(".add-task-btn");
      btn?.insertAdjacentElement("beforebegin", card);
    }
  });

  // Обновляем счетчики
  updateCounters(boardId);
}

function createTaskCard(task) {
  const card = document.createElement("div");
  card.className = "task-card";
  card.draggable = true;
  card.dataset.taskId = task.id;
  card.innerHTML = `
    <div class="task-tags">
      ${task.tags ? task.tags.map((tag) => `<span class="task-tag">${tag}</span>`).join("") : ""}
    </div>
    <div class="task-title">${task.title}</div>
    <div class="task-meta">
      <span class="priority ${task.priority}">${getPriorityText(task.priority)}</span>
      <span class="due-date">🕒 ${task.dueDate || "—"}</span>
    </div>
    <div class="task-footer">
      <div class="task-footer-left">
        ${task.assignee ? `<div class="avatar" style="background:#6366f1;color:white">${task.assignee[0]}</div>` : ""}
      </div>
      <div class="task-actions">
        <span class="task-menu" data-action="edit" title="Редактировать">✏️</span>
        <span class="task-menu" data-action="delete" title="Удалить">🗑</span>
      </div>
    </div>
  `;

  // Клик по карточке → открытие результата
  card.addEventListener("click", (e) => {
    if (!e.target.closest("[data-action]")) {
      window.location.href = `task-result.html?taskId=${task.id}`;
    }
  });

  // Редактирование задачи
  card.querySelector('[data-action="edit"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    openTaskModal(task, currentBoardId, task.status);
  });

  // Удаление задачи
  card
    .querySelector('[data-action="delete"]')
    ?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteTask(task.id);
    });

  // Drag events
  card.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => (card.style.opacity = "0.5"), 0);
  });
  card.addEventListener("dragend", () => {
    card.style.opacity = "1";
  });

  return card;
}

function getPriorityText(p) {
  if (p === "high") return "↑ Высокий";
  if (p === "low") return "↓ Низкий";
  return "− Средний";
}

// ===== DRAG AND DROP =====
function setupDragAndDrop() {
  const columns = document.querySelectorAll(".column-body");
  columns.forEach((column) => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      column.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
    });
    column.addEventListener("dragleave", () => {
      column.style.backgroundColor = "";
    });

    column.addEventListener("drop", async (e) => {
      e.preventDefault();
      column.style.backgroundColor = "";

      const taskId = Number(e.dataTransfer.getData("text/plain"));
      const newStatus = getStatusFromColumn(column.closest(".column"));

      await moveTask(taskId, newStatus);
    });
  });
}

function getStatusFromColumn(column) {
  const title = column.querySelector(".column-title")?.textContent;
  if (!title) return "todo";
  if (title.includes("Не начато")) return "todo";
  if (title.includes("В работе")) return "in-progress";
  if (title.includes("Готово")) return "done";
  return "todo";
}

function getColumnByStatus(status) {
  const titles = {
    todo: "Не начато",
    "in-progress": "В работе",
    done: "Готово",
  };
  return Array.from(document.querySelectorAll(".column")).find(
    (col) => col.querySelector(".column-title")?.textContent === titles[status],
  );
}

// ===== CRUD ЗАДАЧ ЧЕРЕЗ API =====
async function moveTask(taskId, newStatus) {
  try {
    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("❌ Ошибка обновления задачи:", err);
      alert(err.detail || "Ошибка при перемещении задачи");
      return;
    }

    const updatedTask = await res.json();
    console.log("✅ Задача перемещена:", updatedTask);

    // Обновляем в localStorage
    const tasks = storage.getTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) {
      tasks[idx].status = newStatus;
      storage.saveTasks(tasks);
    }

    renderTasks(currentBoardId);
  } catch (error) {
    console.error("Move task error:", error);
    alert("Ошибка сети при перемещении задачи");
  }
}

async function deleteTask(taskId) {
  if (!confirm("Удалить задачу?")) return;

  try {
    const res = await fetch(`${API_URL}/api/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || "Ошибка при удалении");
      return;
    }

    // Удаляем из localStorage
    const tasks = storage.getTasks().filter((t) => t.id !== taskId);
    storage.saveTasks(tasks);

    renderTasks(currentBoardId);
    showToast("Задача удалена", "success");
  } catch (error) {
    console.error("Delete task error:", error);
    alert("Ошибка сети при удалении задачи");
  }
}

// ===== МОДАЛЬНОЕ ОКНО =====
function openTaskModal(task = null, boardId = null, status = "todo") {
  const modal = document.getElementById("taskModal");
  const title = document.getElementById("modalTitle");
  const saveBtn = document.querySelector(".btn-save");
  const form = document.getElementById("taskForm");

  // Сброс формы
  form.reset();
  document.getElementById("editingTaskId").value = "";

  if (task) {
    // Редактирование
    title.textContent = "Редактировать задачу";
    saveBtn.textContent = "Сохранить";
    document.getElementById("editingTaskId").value = task.id;
    document.getElementById("taskTitle").value = task.title || "";
    document.getElementById("taskDescription").value = task.description || "";
    document.getElementById("taskStatus").value = task.status || "todo";
    document.getElementById("taskPriority").value = task.priority || "med";
    document.getElementById("taskDueDate").value = task.dueDate || "";
    document.getElementById("taskTags").value = task.tags
      ? task.tags.join(", ")
      : "";
  } else {
    // Создание
    title.textContent = "Новая задача";
    saveBtn.textContent = "Создать задачу";
    document.getElementById("taskStatus").value = status;
  }

  modal.classList.add("active");
  document.getElementById("taskTitle").focus();
}

function closeTaskModal() {
  document.getElementById("taskModal").classList.remove("active");
}

function setupModalHandlers() {
  // Закрытие по кнопкам
  document
    .getElementById("modalClose")
    ?.addEventListener("click", closeTaskModal);
  document
    .getElementById("modalCancel")
    ?.addEventListener("click", closeTaskModal);

  // Закрытие по клику на overlay
  document.getElementById("taskModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closeTaskModal();
    }
  });

  // Закрытие по Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("taskModal");
      if (modal && modal.classList.contains("active")) {
        closeTaskModal();
      }
    }
  });

  // Обработка формы
  document.getElementById("taskForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editingId = document.getElementById("editingTaskId").value;
    const title = document.getElementById("taskTitle").value.trim();

    if (!title) {
      document.getElementById("taskTitle").focus();
      return;
    }

    const tagsStr = document.getElementById("taskTags").value.trim();
    const tags = tagsStr
      ? tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : [];

    const taskData = {
      title,
      description: document.getElementById("taskDescription").value.trim(),
      status: document.getElementById("taskStatus").value,
      priority: document.getElementById("taskPriority").value,
      due_date: document.getElementById("taskDueDate").value.trim() || null,
      board_id: currentBoardId,
      assignee_id: null, // Пока не реализовано
    };

    try {
      if (editingId) {
        // Редактирование через API
        const res = await fetch(`${API_URL}/api/tasks/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(taskData),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.detail || "Ошибка при сохранении");
          return;
        }

        const updatedTask = await res.json();
        console.log("✅ Задача обновлена:", updatedTask);

        // Обновляем в localStorage
        const tasks = storage.getTasks();
        const idx = tasks.findIndex((t) => t.id === Number(editingId));
        if (idx !== -1) {
          tasks[idx] = {
            ...tasks[idx],
            ...taskData,
            dueDate: taskData.due_date,
            tags,
          };
          storage.saveTasks(tasks);
        }
      } else {
        // Создание через API
        const res = await fetch(`${API_URL}/api/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(taskData),
        });

        if (!res.ok) {
          const err = await res.json();
          alert(err.detail || "Ошибка при создании");
          return;
        }

        const newTask = await res.json();
        console.log("✅ Задача создана:", newTask);

        // Добавляем в localStorage
        const tasks = storage.getTasks();
        tasks.push({
          id: newTask.id,
          boardId: newTask.board_id,
          title: newTask.title,
          description: newTask.description || "",
          status: newTask.status,
          priority: newTask.priority,
          dueDate: newTask.due_date || "",
          assignee: null,
          assigneeId: newTask.assignee_id,
          tags,
          studentFiles: [],
          mentorFiles: [],
          mentorComment: "",
          subtasks: [],
          activity: [],
          createdAt: new Date().toISOString(),
        });
        storage.saveTasks(tasks);
      }

      closeTaskModal();
      renderTasks(currentBoardId);
      showToast(editingId ? "Задача обновлена" : "Задача создана", "success");
    } catch (error) {
      console.error("Save task error:", error);
      alert("Ошибка сети при сохранении задачи");
    }
  });
}

function updateCounters(boardId) {
  const tasks = storage.getTasks().filter((t) => t.boardId === boardId);
  document.getElementById("count-todo").textContent = tasks.filter(
    (t) => t.status === "todo",
  ).length;
  document.getElementById("count-progress").textContent = tasks.filter(
    (t) => t.status === "in-progress",
  ).length;
  document.getElementById("count-done").textContent = tasks.filter(
    (t) => t.status === "done",
  ).length;
}

// ===== TOAST =====
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `position: fixed; bottom: 2rem; right: 2rem; padding: 1rem 1.5rem; background: ${type === "success" ? "var(--status-green, #22c55e)" : "var(--accent-blue, #3b82f6)"}; color: white; border-radius: var(--radius-md, 8px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; animation: slideIn 0.3s ease;`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Добавляем CSS для анимаций
if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }`;
  document.head.appendChild(style);
}
