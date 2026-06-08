import { storage } from "../utils/storage.js";

const grid = document.querySelector(".boards-grid");
grid.innerHTML = "";

const boards = storage.getBoards();
const currentUser = storage.getCurrentUser();

if (boards.length === 0) {
  window.location.href = "welcome.html";
}

boards.forEach((board) => {
  // Считаем прогресс по задачам этой доски
  const boardTasks = storage.getTasks().filter((t) => t.boardId === board.id);
  const doneTasks = boardTasks.filter((t) => t.status === "done").length;
  const totalTasks = boardTasks.length;
  const progressPercent =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const cardHTML = `
    <article class="board-card" onclick="window.location.href='mainboard.html?boardId=${board.id}'" style="cursor: pointer;">
      <div class="card-header">
        <div class="card-icon">IM</div>
        <button class="card-menu" onclick="event.stopPropagation(); deleteBoard(${board.id}, '${board.name}')">•••</button>
      </div>
      <div>
        <h3 class="card-title">${board.name}</h3>
        <p class="card-desc">${board.description || "Нет описания"}</p>
      </div>
      
      ${
        totalTasks > 0
          ? `
      <div class="card-progress">
        <div class="progress-info">
          <span>${doneTasks}/${totalTasks} задач выполнено</span>
          <span>${progressPercent}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      `
          : '<p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.5rem;">Пока нет задач</p>'
      }
      
      <div class="card-footer">
        <div class="avatars">
          <div class="avatar" style="background:#6366f1; color:white;">${board.ownerName ? board.ownerName.charAt(0) : "?"}</div>
        </div>
        <span class="time">Только что</span>
      </div>
    </article>
  `;

  grid.insertAdjacentHTML("beforeend", cardHTML);
});

// Функция удаления доски (глобальная)
window.deleteBoard = function (boardId, boardName) {
  if (confirm(`Удалить доску "${boardName}"? Это действие нельзя отменить.`)) {
    // Удаляем доску
    const boards = storage.getBoards().filter((b) => b.id !== boardId);
    storage.saveBoards(boards);

    // Удаляем все задачи этой доски
    const tasks = storage.getTasks().filter((t) => t.boardId !== boardId);
    storage.saveTasks(tasks);

    // Перерисовываем дашборд
    location.reload();

    showToast(`Доска "${boardName}" удалена`, "success");
  }
};

// Кнопка "Создать новую"
const addBtnHTML = `
  <button class="board-card create-new" onclick="window.location.href='welcome.html'">
    <div class="create-icon">+</div>
    <span class="create-text">Создать новую доску</span>
  </button>
`;
grid.insertAdjacentHTML("beforeend", addBtnHTML);

// Toast уведомления
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === "success" ? "var(--status-green, #22c55e)" : "var(--accent-blue, #3b82f6)"};
    color: white;
    border-radius: var(--radius-md, 8px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

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
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
