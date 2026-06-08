// ✅ ПРАВИЛЬНО: именованный экспорт объекта
export const storage = {
  getUsers: () => JSON.parse(localStorage.getItem("imctech_users") || "[]"),
  saveUsers: (users) =>
    localStorage.setItem("imctech_users", JSON.stringify(users)),
  getCurrentUser: () =>
    JSON.parse(localStorage.getItem("imctech_current_user")),
  setCurrentUser: (user) =>
    localStorage.setItem("imctech_current_user", JSON.stringify(user)),
  clearCurrentUser: () => localStorage.removeItem("imctech_current_user"),

  getTasks: () => JSON.parse(localStorage.getItem("imctech_tasks") || "[]"),
  saveTasks: (tasks) =>
    localStorage.setItem("imctech_tasks", JSON.stringify(tasks)),

  getBoards: () => JSON.parse(localStorage.getItem("imctech_boards") || "[]"),
  saveBoards: (boards) =>
    localStorage.setItem("imctech_boards", JSON.stringify(boards)),
  createBoard: (board) => {
    const boards = storage.getBoards();
    boards.push(board);
    storage.saveBoards(boards);
  },

  // Участники доски хранятся внутри объекта доски в поле members
  getBoardMembers: (boardId) => {
    const board = storage.getBoards().find((b) => b.id === boardId);
    return board?.members || [];
  },

  saveBoardMembers: (boardId, members) => {
    const boards = storage.getBoards();
    const idx = boards.findIndex((b) => b.id === boardId);
    if (idx !== -1) {
      boards[idx].members = members;
      storage.saveBoards(boards);
    }
  },

  addMember: (boardId, member) => {
    const members = storage.getBoardMembers(boardId);
    // Проверка на дубликат по email
    if (members.find((m) => m.email === member.email)) {
      return { success: false, error: "Участник уже добавлен" };
    }
    members.push({
      id: Date.now(),
      ...member,
      role: member.role || "student",
      status: member.status || "participant",
      joinedAt: new Date().toISOString(),
    });
    storage.saveBoardMembers(boardId, members);
    return { success: true };
  },

  removeMember: (boardId, memberId) => {
    const members = storage
      .getBoardMembers(boardId)
      .filter((m) => m.id !== memberId);
    storage.saveBoardMembers(boardId, members);
  },

  updateMember: (boardId, memberId, updates) => {
    const members = storage.getBoardMembers(boardId);
    const idx = members.findIndex((m) => m.id === memberId);
    if (idx !== -1) {
      members[idx] = { ...members[idx], ...updates };
      storage.saveBoardMembers(boardId, members);
    }
  },

  deleteBoard: (boardId) => {
    const boards = storage.getBoards().filter((b) => b.id !== boardId);
    storage.saveBoards(boards);
    // Удаляем все задачи этой доски
    const tasks = storage.getTasks().filter((t) => t.boardId !== boardId);
    storage.saveTasks(tasks);
  },
};
