import { AuthBindings } from "@refinedev/core";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// For Electron app, use localhost directly since process.env isn't available in renderer
const API_URL = "http://localhost:4000/api";

export const authProvider: AuthBindings = {
  login: async ({ email, password }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem("ez-token", data.token);
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      return {
        success: false,
        error: {
          message: error.response?.data?.error || "Login failed",
          name: "LoginError"
        }
      };
    }
  },

  register: async ({ email, password, forename, surname }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/register`, { 
        email, 
        password, 
        forename, 
        surname 
      });
      // Store the token after successful registration
      localStorage.setItem("ez-token", data.token);
      return { success: true };
    } catch (error: any) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: {
          message: error.response?.data?.error || "Registration failed",
          name: "RegisterError"
        }
      };
    }
  },

  logout: async () => {
    localStorage.removeItem("ez-token");
    return { success: true };
  },

  check: async () => {
    const token = localStorage.getItem("ez-token");
    if (!token) return { authenticated: false };
    
    try {
      // Verify token is still valid by decoding it
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp && decoded.exp < currentTime) {
        localStorage.removeItem("ez-token");
        return { authenticated: false };
      }
      
      return { authenticated: true };
    } catch (error) {
      localStorage.removeItem("ez-token");
      return { authenticated: false };
    }
  },

  getIdentity: async () => {
    const token = localStorage.getItem("ez-token");
    if (!token) return null;
    
    try {
      const { id, email } = jwtDecode<{ id: number; email: string }>(token);
      return { id, email };
    } catch (error) {
      return null;
    }
  },

  onError: async (error: any) => {
    console.error("Auth error:", error);
    if (error?.status === 401 || error?.response?.status === 401) {
      localStorage.removeItem("ez-token");
      return {
        logout: true,
        redirectTo: "/login",
      };
    }
    return {};
  },
};
