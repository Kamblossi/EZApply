import { DataProvider } from "@refinedev/core";
import axios from "axios";

// For Electron app, use localhost directly since process.env isn't available in renderer
const API_URL = "http://localhost:4000/api";

const http = axios.create();                   // isolate instance

http.interceptors.request.use((config) => {    // inject Bearer
  const token = localStorage.getItem("ez-token");
  if (token) config.headers!.Authorization = `Bearer ${token}`;
  return config;
});

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const { data } = await http.get(`${API_URL}/${resource}`, { 
      params: { 
        ...pagination,
        ...filters,
        ...sorters 
      }
    });
    return { data: data.items || data.data || data, total: data.total || data.length || 0 };
  },
  
  getOne: async ({ resource, id }) => {
    // Handle special profile resource
    if (resource === "profile" && id === "me") {
      const { data } = await http.get(`${API_URL}/profile`);
      return { data: data.data || data };
    }
    
    const { data } = await http.get(`${API_URL}/${resource}/${id}`);
    return { data: data.data || data };
  },
  
  create: async ({ resource, variables }) => {
    const { data } = await http.post(`${API_URL}/${resource}`, variables);
    return { data: data.data || data };
  },
  
  update: async ({ resource, id, variables }) => {
    // Handle special profile resource
    if (resource === "profile" && id === "me") {
      const { data } = await http.put(`${API_URL}/profile`, variables);
      return { data: data.data || data };
    }
    
    const { data } = await http.put(`${API_URL}/${resource}/${id}`, variables);
    return { data: data.data || data };
  },
  
  deleteOne: async ({ resource, id }) => {
    const { data } = await http.delete(`${API_URL}/${resource}/${id}`);
    return { data: data.data || data || { id } };
  },
  
  getMany: async ({ resource, ids }) => {
    const responses = await Promise.all(
      ids.map((id) => http.get(`${API_URL}/${resource}/${id}`))
    );
    const data = responses.map((response) => response.data.data || response.data);
    return { data };
  },

  getApiUrl: () => API_URL,
};
