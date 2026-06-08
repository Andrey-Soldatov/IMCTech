import { storage } from "../utils/storage.js";

let allTasks = [];
let allBoards = [];
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  currentUser = storage.getCurrentUser();
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  // Загружаем данные
  allTasks = storage.getTasks();
  allBoards = storage.getBoards();

  // Заполняем фильтры
  populateFilters();

  // Рендерим статистику и таблицу
  renderStats();
  renderTable();

  // Обработчики фильтров
  setupFilters();
});

// ===== ЗАПОЛНЕНИЕ ФИЛЬТРОВ =====
function populateFilters() {
  const boardSelect = document.getElementById("filterBoard");
  const studentSelect = document.getElementById("filterStudent");

  // Доски
  allBoards.forEach((board) => {
    const option = document.createElement("option");
    option.value = board.id;
    option.textContent = board.name;
    boardSelect.appendChild(option);
  });

  // Студенты (уникальные assignee из задач)
  const students = new Set();
  allTasks.forEach((task) => {
    if (task.assignee) students.add(task.assignee);
  });
  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student;
    option.textContent = student;
    studentSelect.appendChild(option);
  });
}

// ===== СТАТИСТИКА =====
function renderStats() {
  const filteredTasks = getFilteredTasks();

  const total = filteredTasks.filter(
    (t) => t.status === "done" || t.status === "review",
  ).length;
  const accepted = filteredTasks.filter((t) => t.status === "done").length;
  const rejected = filteredTasks.filter(
    (t) => t.status === "in-progress" && t.mentorComment,
  ).length;
  const pending = filteredTasks.filter((t) => t.status === "review").length;

  document.querySelectorAll(".stat-value")[0].textContent = total;
  document.querySelectorAll(".stat-value")[1].textContent = accepted;
  document.querySelectorAll(".stat-value")[2].textContent = rejected;
  document.querySelectorAll(".stat-value")[3].textContent = pending;
}

// ===== ТАБЛИЦА =====
function renderTable() {
  const tbody = document.querySelector(".results-table tbody");
  const emptyState = document.querySelector(".empty-state");
  const table = document.querySelector(".results-table");

  tbody.innerHTML = "";

  const filteredTasks = getFilteredTasks();
  const displayTasks = filteredTasks.filter(
    (t) =>
      t.status === "done" ||
      t.status === "review" ||
      (t.status === "in-progress" && t.mentorComment),
  );

  if (displayTasks.length === 0) {
    table.style.display = "none";
    emptyState.style.display = "flex";
    return;
  }

  table.style.display = "table";
  emptyState.style.display = "none";

  displayTasks.forEach((task) => {
    const board = allBoards.find((b) => b.id === task.boardId);
    const boardName = board ? board.name : "Неизвестная доска";

    const statusMap = {
      done: { text: "Принято", class: "status-accepted" },
      review: { text: "На проверке", class: "status-review" },
      "in-progress": { text: "Возвращено", class: "status-rejected" },
    };

    const status = statusMap[task.status] || { text: task.status, class: "" };
    const date = task.dueDate || formatDate(task.createdAt);
    const comment = task.mentorComment || "—";
    const assignee = task.assignee || "Не назначен";
    const initial =
      assignee !== "Не назначен"
        ? assignee
            .split(" ")
            .map((n) => n[0])
            .join("")
            .substring(0, 2)
            .toUpperCase()
        : "?";

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>
                <div class="task-cell">
                    <span class="task-name">${task.title}</span>
                    <span class="task-board">${boardName}</span>
                </div>
            </td>
            <td>
                <div class="student-cell">
                    <div class="avatar" style="background:#14b8a6; color:white">${initial}</div>
                    <span class="student-name">${assignee}</span>
                </div>
            </td>
            <td>${currentUser.name || "Наставник"}</td>
            <td><span class="status-badge ${status.class}">${status.text}</span></td>
            <td class="date-cell">${date}</td>
            <td class="comment-preview">${comment}</td>
            <td><a href="task-result.html?taskId=${task.id}" class="action-link">Открыть</a></td>
        `;
    tbody.appendChild(row);
  });
}

// ===== ФИЛЬТРАЦИЯ =====
function getFilteredTasks() {
  const boardFilter = document.getElementById("filterBoard").value;
  const statusFilter = document.getElementById("filterStatus").value;
  const studentFilter = document.getElementById("filterStudent").value;
  const searchFilter = document
    .getElementById("filterSearch")
    .value.toLowerCase();

  return allTasks.filter((task) => {
    if (boardFilter && task.boardId !== Number(boardFilter)) return false;
    if (statusFilter && task.status !== statusFilter) return false;
    if (studentFilter && task.assignee !== studentFilter) return false;
    if (searchFilter && !task.title.toLowerCase().includes(searchFilter))
      return false;
    return true;
  });
}

function setupFilters() {
  ["filterBoard", "filterStatus", "filterStudent", "filterSearch"].forEach(
    (id) => {
      document.getElementById(id).addEventListener("change", () => {
        renderStats();
        renderTable();
      });
    },
  );

  document.getElementById("filterSearch").addEventListener("input", () => {
    renderStats();
    renderTable();
  });
}

// ===== УТИЛИТЫ =====
function formatDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const months = [
    "янв",
    "фев",
    "мар",
    "апр",
    "май",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
