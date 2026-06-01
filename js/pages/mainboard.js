import { storage } from "../utils/storage.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Получаем ID доски из URL
  const urlParams = new URLSearchParams(window.location.search);
  const boardId = Number(urlParams.get("boardId"));

  if (!boardId) {
    window.location.href = "dashboard.html";
    return;
  }

  // 2. Загружаем задачи
  const allTasks = storage.getTasks();
  const boardTasks = allTasks.filter((t) => t.boardId === boardId);

  // Обновляем заголовок
  const titleEl = document.querySelector(".breadcrumbs .current");
  const currentBoard = storage.getBoards().find((b) => b.id === boardId);
  if (titleEl && currentBoard) titleEl.textContent = currentBoard.name;

  // 3. Функция отрисовки карточки
  function createCardHTML(task) {
    return `
        <div class="task-card" onclick="window.location.href='task-result.html?taskId=${task.id}'">
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="priority ${task.priority}">${getPriorityText(task.priority)}</span>
            </div>
        </div>
        `;
  }

  function getPriorityText(p) {
    if (p === "high") return "↑ Высокий";
    if (p === "low") return "↓ Низкий";
    return "− Средний";
  }

  // 4. Раскидываем по колонкам
  const columnBodies = document.querySelectorAll(".column-body");
  boardTasks.forEach((task) => {
    let colIndex = 0;
    if (task.status === "in-progress") colIndex = 1;
    if (task.status === "done") colIndex = 2;

    if (columnBodies[colIndex]) {
      const btn = columnBodies[colIndex].querySelector(".add-task-btn");
      if (btn) btn.insertAdjacentHTML("beforebegin", createCardHTML(task));
    }
  });

  // 5. Обработка кнопки "Добавить задачу"
  document.querySelectorAll(".add-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const title = prompt("Название задачи:");
      if (title) {
        const column = btn.closest(".column");
        const header = column.querySelector(".column-title").textContent;
        let status = "todo";
        if (header.includes("В работе")) status = "in-progress";
        if (header.includes("Готово")) status = "done";

        const newTask = {
          id: Date.now(),
          boardId: boardId,
          title,
          status,
          priority: "med",
        };

        const tasks = storage.getTasks();
        tasks.push(newTask);
        storage.saveTasks(tasks);
        location.reload();
      }
    });
  });
});
