import { AuthBindings } from "@refinedev/core";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// For Electron app, use localhost directly since process.env isn't available in renderer
const API_URL = "http://localhost:4000/api";

export const authProvider: AuthBindings = {
  login: async ({ email, password }) => {
    const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
    localStorage.setItem("ez-token", data.token);          // ➊
    return { success: true };
  },

  register: async ({ email, password, name }) => {
    // For the guided lab, we'll split the name into forename and surname
    const names = name ? name.split(' ') : ['', ''];
    const forename = names[0] || '';
    const surname = names.slice(1).join(' ') || 'User';
    
    await axios.post(`${API_URL}/auth/register`, { 
      email, 
      password, 
      forename, 
      surname 
    });
    return { success: true };
  },

  logout: async () => {
    localStorage.removeItem("ez-token");
    return { success: true };
  },

  check: async () => ({ authenticated: Boolean(localStorage.getItem("ez-token")) }),

  getIdentity: async () => {
    const token = localStorage.getItem("ez-token");
    if (!token) return null;
    const { name, email } = jwtDecode<{ name: string; email: string }>(token); // ➋
    return { name, email };
  },

  onError: async (error: any) => {
    if (error?.status === 401) {
      localStorage.removeItem("ez-token");
      return {
        logout: true,
        redirectTo: "/login",
      };
    }
    return {};
  },
};
