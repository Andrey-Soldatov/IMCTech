import { storage } from "../utils/storage.js";

// Находим кнопку создания (по классу или тексту)
const createBtn = document.querySelector(".btn-primary");

if (createBtn) {
  createBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Запрещаем стандартную отправку формы

    const currentUser = storage.getCurrentUser();
    if (!currentUser) {
      alert("Ошибка: Пользователь не найден. Попробуйте перезайти.");
      return;
    }

    // Находим поля ввода (по placeholder или тегу)
    // В твоем коде input скорее всего один, и textarea один
    const nameInput = document.querySelector('input[type="text"]');
    const descInput = document.querySelector("textarea");

    const boardName = nameInput ? nameInput.value.trim() : "";
    const boardDesc = descInput ? descInput.value.trim() : "";

    if (!boardName) {
      alert("Пожалуйста, введите название доски");
      return;
    }

    // 1. Создаем объект доски
    const newBoard = {
      id: Date.now(), // Уникальный ID
      name: boardName,
      description: boardDesc,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    // 2. Сохраняем в LocalStorage
    const boards = storage.getBoards(); // Получаем старые
    boards.push(newBoard); // Добавляем новую
    storage.saveBoards(boards); // Сохраняем обратно

    console.log("✅ Доска создана:", newBoard);

    // 3. Перенаправляем на дашборд
    window.location.href = "dashboard.html";
  });
}
