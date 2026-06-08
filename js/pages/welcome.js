import { storage } from "../utils/storage.js";

const createBtn = document.querySelector(".btn-primary");
if (createBtn) {
  createBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const currentUser = storage.getCurrentUser();
    if (!currentUser) {
      alert("Ошибка: Пользователь не найден.");
      return;
    }

    const nameInput = document.querySelector('input[type="text"]');
    const descInput = document.querySelector("textarea");

    const boardName = nameInput ? nameInput.value.trim() : "";
    const boardDesc = descInput ? descInput.value.trim() : "";

    if (!boardName) {
      alert("Пожалуйста, введите название доски");
      return;
    }

    const newBoard = {
      id: Date.now(),
      name: boardName,
      description: boardDesc,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
      createdAt: new Date().toISOString(),
      // 🔥 НОВОЕ: участники доски
      members: [
        {
          id: Date.now(),
          userId: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: "mentor",
          status: "admin",
          isCreator: true,
          joinedAt: new Date().toISOString(),
        },
      ],
    };

    storage.createBoard(newBoard);
    window.location.href = "dashboard.html";
  });
}
