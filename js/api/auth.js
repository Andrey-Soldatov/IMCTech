import { storage } from "../utils/storage.js";

const API_URL = "http://localhost:3000";

// ===== LOGIN =====
export async function login(email, password) {
  try {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.detail || "Ошибка входа" };
    }

    const data = await res.json();

    // Сохраняем токен
    localStorage.setItem("imctech_token", data.access_token);
    console.log(
      "✅ Токен сохранён:",
      data.access_token.substring(0, 30) + "...",
    );

    // Получаем данные пользователя
    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (meRes.ok) {
      const user = await meRes.json();
      storage.setCurrentUser(user);
      console.log("✅ Пользователь:", user);
    }

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Ошибка сети. Проверьте что бэкенд запущен.",
    };
  }
}

// ===== REGISTER =====
export async function register(data) {
  try {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { success: false, error: err.detail || "Ошибка регистрации" };
    }

    // После регистрации — сразу логинимся
    return await login(data.email, data.password);
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, error: "Ошибка сети." };
  }
}

// ===== CHECK AUTH =====
export function checkAuth() {
  const user = storage.getCurrentUser();
  const path = window.location.pathname;
  const isAuth = path.includes("login.html") || path.includes("register.html");

  if (!user && !isAuth) {
    window.location.href = "login.html";
  }
  if (user && isAuth) {
    window.location.href = "dashboard.html";
  }
}

// ===== LOGOUT =====
export function logout() {
  localStorage.removeItem("imctech_token");
  storage.clearCurrentUser();
  window.location.href = "login.html";
}

// ===== YANDEX OAUTH =====
export function yandexLogin() {
  window.location.href = `${API_URL}/api/auth/yandex`;
}
