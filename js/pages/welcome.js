import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";

function getToken() {
  return localStorage.getItem("imctech_token");
}

const form = document.getElementById("create-board-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentUser = storage.getCurrentUser();
    console.log("👤 Пользователь:", currentUser);

    if (!currentUser) {
      alert("Ошибка: Пользователь не найден. Залогиньтесь заново.");
      window.location.href = "login.html";
      return;
    }

    const token = getToken();
    console.log("🔑 Токен:", token ? token.substring(0, 30) + "..." : "НЕТ");

    if (!token) {
      alert("Ошибка: Токен не найден. Залогиньтесь заново.");
      window.location.href = "login.html";
      return;
    }

    const boardName = document.getElementById("board-name").value.trim();
    const boardDesc = document.getElementById("board-desc").value.trim();

    if (!boardName) {
      alert("Введите название доски");
      return;
    }

    console.log("📤 Создаём доску:", boardName);

    try {
      const res = await fetch(`${API_URL}/api/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: boardName,
          description: boardDesc || null,
        }),
      });

      console.log("📥 Статус ответа:", res.status);

      if (!res.ok) {
        const err = await res.json();
        console.error("❌ Ошибка:", err);
        alert(err.detail || "Ошибка при создании доски");
        return;
      }

      const board = await res.json();
      console.log("✅ Доска создана:", board);

      // Сохраняем в localStorage для совместимости
      const newBoard = {
        id: board.id,
        name: board.name,
        description: board.description,
        ownerId: currentUser.id,
        ownerName: currentUser.name,
        createdAt: new Date().toISOString(),
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
    } catch (error) {
      console.error("❌ Ошибка сети:", error);
      alert("Ошибка сети. Проверьте что бэкенд запущен на порту 3000.");
    }
  });
}
