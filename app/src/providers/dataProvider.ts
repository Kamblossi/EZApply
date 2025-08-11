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
    const params: any = {};
    
    // Handle pagination
    if (pagination) {
      params.page = pagination.current || 1;
      params.limit = pagination.pageSize || 20;
    }
    
    // Handle filters
    if (filters) {
      filters.forEach((filter) => {
        if (filter.operator === 'contains') {
          params.search = filter.value;
        } else {
          params[filter.field] = filter.value;
        }
      });
    }
    
    // Handle sorters
    if (sorters && sorters.length > 0) {
      const sorter = sorters[0];
      params.sort = sorter.field;
      params.order = sorter.order;
    }

    const { data } = await http.get(`${API_URL}/${resource}`, { params });
    
    // Handle different response structures
    if (data.data && data.pagination) {
      // New paginated structure from jobs endpoint
      return { 
        data: data.data, 
        total: data.pagination.totalCount 
      };
    } else {
      // Legacy structure
      return { 
        data: data.items || data.data || data, 
        total: data.total || data.length || 0 
      };
    }
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
