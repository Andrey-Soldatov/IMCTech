export const storage = {
  getUsers: () => JSON.parse(localStorage.getItem("imctech_users") || "[]"),
  saveUsers: (users) =>
    localStorage.setItem("imctech_users", JSON.stringify(users)),
  getCurrentUser: () =>
    JSON.parse(localStorage.getItem("imctech_current_user")),
  setCurrentUser: (user) =>
    localStorage.setItem("imctech_current_user", JSON.stringify(user)),
  clearCurrentUser: () => localStorage.removeItem("imctech_current_user"),
  getBoards: () => JSON.parse(localStorage.getItem("imctech_boards") || "[]"),

  saveBoards: (boards) =>
    localStorage.setItem("imctech_boards", JSON.stringify(boards)),

  createBoard: (boardData) => {
    const boards = storage.getBoards();
    boards.push(boardData);
    storage.saveBoards(boards);
  },
};
