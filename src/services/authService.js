import { apiRequest, onUnauthorized } from "./apiClient.js";
let sessionUser = null,
  revision = 0;
const listeners = new Set();
function setUser(user) {
  sessionUser = user;
  revision++;
  listeners.forEach((fn) => fn(user));
}
onUnauthorized(() => setUser(null));
export const authService = {
  getUser: () => sessionUser,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async me() {
    const current = revision;
    try {
      const result = await apiRequest("/auth/me", {
        notifyOnUnauthorized: false,
      });
      if (current === revision) setUser(result.data);
      return { data: sessionUser };
    } catch (error) {
      if (error.status === 401) {
        if (current === revision) setUser(null);
        return { data: sessionUser };
      }
      throw error;
    }
  },
  async signup(values) {
    const result = await apiRequest("/auth/register", {
      method: "POST",
      body: values,
    });
    setUser(result.data);
    return result;
  },
  async login(email, password) {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setUser(result.data);
    return result;
  },
  async logout() {
    const result = await apiRequest("/auth/logout", { method: "POST" });
    setUser(null);
    return result;
  },
  async update(values) {
    const result = await apiRequest("/auth/profile", {
      method: "PATCH",
      body: values,
    });
    setUser(result.data);
    return result;
  },
};
