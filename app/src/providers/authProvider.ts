import { AuthProvider } from "@refinedev/core";

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const API_URL = "http://localhost:4000";

export const authProvider: AuthProvider = {
  // Login method
  login: async ({ email, password }: LoginParams) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();

      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        return {
          success: true,
          redirectTo: "/dashboard",
        };
      }

      throw new Error("Invalid response from server");
    } catch (error) {
      return {
        success: false,
        error: {
          name: "LoginError",
          message: error instanceof Error ? error.message : "Login failed",
        },
      };
    }
  },

  // Register method
  register: async ({ email, password, firstName, lastName }: RegisterParams) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        body: JSON.stringify({ email, password, firstName, lastName }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();

      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        return {
          success: true,
          redirectTo: "/dashboard",
        };
      }

      throw new Error("Invalid response from server");
    } catch (error) {
      return {
        success: false,
        error: {
          name: "RegisterError",
          message: error instanceof Error ? error.message : "Registration failed",
        },
      };
    }
  },

  // Logout method
  logout: async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    
    return {
      success: true,
      redirectTo: "/login",
    };
  },

  // Check authentication status
  check: async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }

    try {
      // Verify token with backend
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        return {
          authenticated: true,
        };
      }

      // Token is invalid, remove it
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    } catch {
      // Network error or token invalid
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }
  },

  // Get user permissions (optional)
  getPermissions: async () => {
    const user = localStorage.getItem("user");
    
    if (user) {
      const userData = JSON.parse(user);
      return userData.permissions || [];
    }
    
    return [];
  },

  // Get user identity
  getIdentity: async () => {
    const user = localStorage.getItem("user");
    
    if (user) {
      const userData = JSON.parse(user);
      return {
        id: userData.id,
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        avatar: userData.avatar || undefined,
      };
    }
    
    return null;
  },

  // Handle authentication errors
  onError: async (error: any) => {
    if (error?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      return {
        logout: true,
        redirectTo: "/login",
      };
    }

    return {};
  },
};
