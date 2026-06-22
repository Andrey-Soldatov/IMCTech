import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";
let currentBoardId = null;
let currentUserRole = "student"; // 🔥 По умолчанию student

function getToken() {
  return localStorage.getItem("imctech_token");
}

// ✅ ОДИН ЕДИНСТВЕННЫЙ СЛУШАТЕЛЬ СОБЫТИЯ
document.addEventListener("DOMContentLoaded", async () => {
  // 1. ЖЕСТКАЯ ФИКСАЦИЯ ССЫЛОК САЙДБАРА
  const urlParams = new URLSearchParams(window.location.search);
  const boardIdFromUrl = urlParams.get("boardId");
  if (boardIdFromUrl) {
    document.querySelectorAll(".sidebar a").forEach((link) => {
      const href = link.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("http")) {
        if (
          href.includes("mainboard.html") ||
          href.includes("results.html") ||
          href.includes("settings.html")
        ) {
          const [base, query] = href.split("?");
          const params = new URLSearchParams(query || "");
          params.set("boardId", boardIdFromUrl);
          link.setAttribute("href", `${base}?${params.toString()}`);
        }
      }
    });

    // 7. НАСТРОЙКА ПОИСКА
    setupTaskSearch();
  }

  // 2. ИНИЦИАЛИЗАЦИЯ ДОСКИ
  currentBoardId = Number(boardIdFromUrl);
  if (!currentBoardId) {
    window.location.href = "dashboard.html";
    return;
  }

  localStorage.setItem("imctech_last_board_id", currentBoardId);

  const board = storage.getBoards().find((b) => b.id === currentBoardId);
  const titleEl = document.querySelector(".breadcrumbs .current");
  if (titleEl && board) titleEl.textContent = board.name;

  // 🔥 3. ОПРЕДЕЛЯЕМ РОЛЬ ПОЛЬЗОВАТЕЛЯ
  await detectUserRole();
  console.log("🎭 Роль пользователя:", currentUserRole);

  // 4. ЗАГРУЗКА И РЕНДЕРИНГ ЗАДАЧ
  await loadAndRenderTasks();

  // 5. НАСТРОЙКА DRAG-AND-DROP
  setupDragAndDrop();

  // 🔥 6. ОБРАБОТЧИКИ КНОПОК "ДОБАВИТЬ ЗАДАЧУ" — ТОЛЬКО ДЛЯ СТУДЕНТОВ!
  const addTaskButtons = document.querySelectorAll(".add-task-btn");
  addTaskButtons.forEach((btn) => {
    if (currentUserRole === "mentor") {
      // 🔥 СКРЫВАЕМ КНОПКИ ДЛЯ НАСТАВНИКА
      btn.style.display = "none";
      console.log("🚫 Кнопка добавления задачи скрыта для наставника");
    } else {
      btn.addEventListener("click", () => {
        const column = btn.closest(".column");
        const status = getStatusFromColumn(column);
        openTaskModal(null, currentBoardId, status);
      });
    }
  });

  // 7. НАСТРОЙКА МОДАЛЬНОГО ОКНА
  setupModalHandlers();
});

// 🔥 ===== ОПРЕДЕЛЕНИЕ РОЛИ =====
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
    }
  } catch (error) {
    console.warn("Не удалось определить роль:", error);
  }
}

// ===== ЗАГРУЗКА ЗАДАЧ ЧЕРЕЗ API =====
async function loadAndRenderTasks() {
  try {
    const res = await fetch(`${API_URL}/api/boards/${currentBoardId}/tasks`, {
      headers: { Authorization: `Bearer ${getToken()}` },
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
      tags: [],
      studentFiles: [],
      mentorFiles: [],
      mentorComment: "",
      subtasks: [],
      activity: [],
      createdAt: new Date().toISOString(),
    }));

    storage.saveTasks(localTasks);
    renderTasks(currentBoardId);
  } catch (error) {
    console.error("Load tasks error:", error);
    renderTasks(currentBoardId);
  }
}

// ===== РЕНДЕРИНГ =====
function renderTasks(boardId) {
  const allTasks = storage.getTasks();
  const boardTasks = allTasks.filter((t) => t.boardId === boardId);

  document.querySelectorAll(".column-body").forEach((body) => {
    const btn = body.querySelector(".add-task-btn");
    body.innerHTML = "";
    if (btn) body.appendChild(btn);
  });

  boardTasks.forEach((task) => {
    const column = getColumnByStatus(task.status);
    if (column) {
      const card = createTaskCard(task);
      const btn = column.querySelector(".add-task-btn");
      btn?.insertAdjacentElement("beforebegin", card);
    }
  });

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
        <span class="task-menu" data-action="delete" title="Удалить">🗑️</span>
      </div>
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (!e.target.closest("[data-action]")) {
      window.location.href = `task-result.html?taskId=${task.id}&boardId=${currentBoardId}`;
    }
  });

  card.querySelector('[data-action="edit"]')?.addEventListener("click", (e) => {
    e.stopPropagation();
    openTaskModal(task, currentBoardId, task.status);
  });

  card
    .querySelector('[data-action="delete"]')
    ?.addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteTask(task.id);
    });

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
  if (title.includes("На проверке")) return "review";
  if (title.includes("Готово")) return "done";
  return "todo";
}

function getColumnByStatus(status) {
  const titles = {
    todo: "Не начато",
    "in-progress": "В работе",
    review: "На проверке",
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
      console.error("Ошибка обновления задачи:", err);
      alert(err.detail || "Ошибка при перемещении задачи");
      return;
    }
    const updatedTask = await res.json();
    console.log("✅ Задача перемещена:", updatedTask);
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
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.detail || "Ошибка при удалении");
      return;
    }
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
  // 🔥 ДВОЙНАЯ ПРОВЕРКА: наставник не может создавать задачи
  if (currentUserRole === "mentor") {
    showToast("Наставник не может создавать задачи", "error");
    return;
  }

  const modal = document.getElementById("taskModal");
  const title = document.getElementById("modalTitle");
  const saveBtn = document.querySelector(".btn-save");
  const form = document.getElementById("taskForm");

  form.reset();
  document.getElementById("editingTaskId").value = "";

  if (task) {
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
  document
    .getElementById("modalClose")
    ?.addEventListener("click", closeTaskModal);
  document
    .getElementById("modalCancel")
    ?.addEventListener("click", closeTaskModal);
  document.getElementById("taskModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeTaskModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const modal = document.getElementById("taskModal");
      if (modal && modal.classList.contains("active")) closeTaskModal();
    }
  });
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
      assignee_id: null,
    };
    try {
      if (editingId) {
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
  document.getElementById("count-review").textContent = tasks.filter(
    (t) => t.status === "review",
  ).length;
  document.getElementById("count-done").textContent = tasks.filter(
    (t) => t.status === "done",
  ).length;
}

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

if (!document.getElementById("toast-styles")) {
  const style = document.createElement("style");
  style.id = "toast-styles";
  style.textContent = `@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }`;
  document.head.appendChild(style);
}

// ===== ПОИСК ПО ЗАДАЧАМ =====
function setupTaskSearch() {
  const searchInput = document.getElementById("taskSearch");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterTasks(searchTerm);
  });
}

function filterTasks(searchTerm) {
  const allCards = document.querySelectorAll(".task-card");

  allCards.forEach((card) => {
    const title =
      card.querySelector(".task-title")?.textContent.toLowerCase() || "";
    const description =
      card.querySelector(".task-description")?.textContent.toLowerCase() || "";
    const tags =
      card.querySelector(".task-tags")?.textContent.toLowerCase() || "";

    const matchesTitle = title.includes(searchTerm);
    const matchesDescription = description.includes(searchTerm);
    const matchesTags = tags.includes(searchTerm);

    if (matchesTitle || matchesDescription || matchesTags) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}
