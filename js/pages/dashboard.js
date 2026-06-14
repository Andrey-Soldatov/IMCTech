import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";

function getToken() {
  return localStorage.getItem("imctech_token");
}

const grid = document.querySelector(".boards-grid");

// ===== ЗАГРУЗКА ДОСОК =====
async function loadBoards() {
  grid.innerHTML = "<p style='color: var(--text-muted);'>Загрузка...</p>";

  try {
    const res = await fetch(`${API_URL}/api/boards`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Токен истёк — выходим
        localStorage.removeItem("imctech_token");
        storage.clearCurrentUser();
        window.location.href = "login.html";
        return;
      }
      throw new Error("Ошибка загрузки досок");
    }

    const apiBoards = await res.json();

    // Если досок нет — редирект на welcome
    if (apiBoards.length === 0) {
      window.location.href = "welcome.html";
      return;
    }

    // Очищаем сетку
    grid.innerHTML = "";

    const currentUser = storage.getCurrentUser();

    // Синхронизируем API-доски с localStorage (для совместимости)
    const syncedBoards = apiBoards.map((apiBoard) => ({
      id: apiBoard.id,
      name: apiBoard.name,
      description: apiBoard.description,
      ownerId: apiBoard.owner_id,
      ownerName:
        currentUser && apiBoard.owner_id === currentUser.id
          ? currentUser.name
          : "Пользователь",
      createdAt: new Date().toISOString(),
      members: [], // Пока пусто, потом загрузим через API
    }));

    // Сохраняем в localStorage для mainboard.js, settings.js и т.д.
    storage.saveBoards(syncedBoards);

    // Рендерим каждую доску
    syncedBoards.forEach((board) => {
      // Получаем задачи для этой доски из localStorage
      const boardTasks = storage
        .getTasks()
        .filter((t) => t.boardId === board.id);
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

    // Кнопка "Создать новую"
    const addBtnHTML = `<button class="board-card create-new" onclick="window.location.href='welcome.html'"><div class="create-icon">+</div><span class="create-text">Создать новую доску</span></button>`;
    grid.insertAdjacentHTML("beforeend", addBtnHTML);
  } catch (error) {
    console.error("Load boards error:", error);
    // Фоллбэк на localStorage если API недоступен
    const localBoards = storage.getBoards();
    if (localBoards.length === 0) {
      window.location.href = "welcome.html";
      return;
    }
    renderLocalBoards(localBoards);
  }
}

// Фоллбэк-рендер из localStorage (если API упал)
function renderLocalBoards(boards) {
  grid.innerHTML = "";
  boards.forEach((board) => {
    const boardTasks = storage.getTasks().filter((t) => t.boardId === board.id);
    const doneTasks = boardTasks.filter((t) => t.status === "done").length;
    const totalTasks = boardTasks.length;
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
  const addBtnHTML = `<button class="board-card create-new" onclick="window.location.href='welcome.html'"><div class="create-icon">+</div><span class="create-text">Создать новую доску</span></button>`;
  grid.insertAdjacentHTML("beforeend", addBtnHTML);
}

// ===== УДАЛЕНИЕ ДОСКИ =====
window.deleteBoard = async function (boardId, boardName) {
  if (!confirm(`Удалить доску "${boardName}"? Это действие нельзя отменить.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/boards/${boardId}`, {
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
    const boards = storage.getBoards().filter((b) => b.id !== boardId);
    storage.saveBoards(boards);
    const tasks = storage.getTasks().filter((t) => t.boardId !== boardId);
    storage.saveTasks(tasks);

    // Перезагружаем список
    await loadBoards();

    showToast(`Доска "${boardName}" удалена`, "success");
  } catch (error) {
    console.error("Delete board error:", error);
    alert("Ошибка сети при удалении доски");
  }
};

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

// ===== ЗАПУСК =====
loadBoards();
