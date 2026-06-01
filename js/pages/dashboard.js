import { storage } from "../utils/storage.js";

// 1. Получаем ссылку на контейнер и очищаем его от статики
const grid = document.querySelector(".boards-grid");
grid.innerHTML = "";

// 2. Получаем список досок из памяти
const boards = storage.getBoards();
const currentUser = storage.getCurrentUser();

if (boards.length === 0) {
  // Если досок нет — сразу кидаем на создание
  window.location.href = "welcome.html";
}

// 3. Рисуем каждую доску
boards.forEach((board) => {
  const cardHTML = `
            <article class="board-card" onclick="window.location.href='mainboard.html?boardId=${board.id}'" style="cursor: pointer;">
                <div class="card-header">
                    <div class="card-icon">IM</div>
                    <button class="card-menu" onclick="event.stopPropagation()">•••</button>
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

  // Вставляем карточку
  grid.insertAdjacentHTML("beforeend", cardHTML);
});

// 4. Добавляем кнопку "Создать новую" в конец
const addBtnHTML = `
        <button class="board-card create-new" onclick="window.location.href='welcome.html'">
            <div class="create-icon">+</div>
            <span class="create-text">Создать новую доску</span>
        </button>
    `;
grid.insertAdjacentHTML("beforeend", addBtnHTML);
