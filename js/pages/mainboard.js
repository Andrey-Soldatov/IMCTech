import { storage } from "../utils/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Получаем ID доски из URL
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = Number(urlParams.get("boardId"));

  if (!boardId) {
    window.location.href = "dashboard.html";
    return;
  }

  const board = storage.getBoards().find((b) => b.id === boardId);
  if (!board) {
    window.location.href = "dashboard.html";
    return;
  }

  // Обновляем заголовок
  const titleEl = document.querySelector(".breadcrumbs .current");
  if (titleEl && board) titleEl.textContent = board.name;

  // 2. Загружаем и рендерим задачи
  renderTasks(boardId);

  // 3. Настраиваем drag-and-drop
  setupDragAndDrop(boardId);

  // 4. Обработчики кнопок "Добавить задачу"
  document.querySelectorAll(".add-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const column = btn.closest(".column");
      const status = getStatusFromColumn(column);
      openTaskModal(null, boardId, status);
    });
  });
});

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
            <span class="task-menu" data-action="delete">🗑</span>
        </div>
    `;

  // Клик по карточке → открытие результата
  card.addEventListener("click", (e) => {
    if (!e.target.closest("[data-action]")) {
      window.location.href = `task-result.html?taskId=${task.id}`;
    }
  });

  // Удаление задачи
  card
    .querySelector('[data-action="delete"]')
    ?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Удалить задачу?")) {
        deleteTask(task.id);
      }
    });

  // ===== DRAG EVENTS =====
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
function setupDragAndDrop(boardId) {
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

    column.addEventListener("drop", (e) => {
      e.preventDefault();
      column.style.backgroundColor = "";

      const taskId = Number(e.dataTransfer.getData("text/plain"));
      const newStatus = getStatusFromColumn(column.closest(".column"));

      moveTask(taskId, newStatus, boardId);
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

// ===== CRUD ЗАДАЧ =====
function moveTask(taskId, newStatus, boardId) {
  const tasks = storage.getTasks();
  const task = tasks.find((t) => t.id === taskId);

  if (task && task.status !== newStatus) {
    task.status = newStatus;
    storage.saveTasks(tasks);
    renderTasks(boardId); // Перерисовываем доску
  }
}

function deleteTask(taskId) {
  const tasks = storage.getTasks().filter((t) => t.id !== taskId);
  storage.saveTasks(tasks);

  // Перерисовываем текущую доску
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = Number(urlParams.get("boardId"));
  if (boardId) renderTasks(boardId);
}

function openTaskModal(task, boardId, status) {
  // Простая реализация через prompt (можно заменить на модальное окно)
  const title = prompt("Название задачи:", task?.title || "");
  if (!title) return;

  const priority = prompt("Приоритет (high/med/low):", task?.priority || "med");
  const dueDate = prompt("Дедлайн (например, 20 янв):", task?.dueDate || "");

  const tasks = storage.getTasks();

  if (task) {
    // Редактирование
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], title, priority, dueDate };
    }
  } else {
    // Создание
    tasks.push({
      id: Date.now(),
      boardId,
      title,
      status: status || "todo",
      priority: priority || "med",
      dueDate: dueDate || "",
      createdAt: new Date().toISOString(),
    });
  }

  storage.saveTasks(tasks);
  renderTasks(boardId);
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
