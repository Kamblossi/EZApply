import { DataProvider } from "@refinedev/core";

const API_URL = "http://localhost:4000";

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  // Get a list of resources
  getList: async ({ resource, pagination, filters, sorters }) => {
    const url = new URL(`${API_URL}/api/${resource}`);

    // Handle pagination
    if (pagination) {
      url.searchParams.append("page", pagination.current?.toString() || "1");
      url.searchParams.append("limit", pagination.pageSize?.toString() || "10");
    }

    // Handle filters
    if (filters) {
      filters.forEach((filter) => {
        if (filter.operator === "eq") {
          url.searchParams.append(filter.field, filter.value);
        }
        // Add more filter operators as needed
      });
    }

    // Handle sorters
    if (sorters && sorters.length > 0) {
      const sorter = sorters[0];
      url.searchParams.append("sort", sorter.field);
      url.searchParams.append("order", sorter.order);
    }

    const response = await fetch(url.toString(), {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    return {
      data: data.data || data,
      total: data.pagination?.total || data.length || 0,
    };
  },

  // Get a single resource
  getOne: async ({ resource, id }) => {
    const response = await fetch(`${API_URL}/api/${resource}/${id}`, {
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    return {
      data: data.data || data,
    };
  },

  // Create a new resource
  create: async ({ resource, variables }) => {
    const response = await fetch(`${API_URL}/api/${resource}`, {
      method: "POST",
      body: JSON.stringify(variables),
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      data: data.data || data,
    };
  },

  // Update a resource
  update: async ({ resource, id, variables }) => {
    const response = await fetch(`${API_URL}/api/${resource}/${id}`, {
      method: "PUT",
      body: JSON.stringify(variables),
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      data: data.data || data,
    };
  },

  // Delete a resource
  deleteOne: async ({ resource, id }) => {
    const response = await fetch(`${API_URL}/api/${resource}/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      data: data.data || data || { id },
    };
  },

  // Get many resources by IDs
  getMany: async ({ resource, ids }) => {
    const responses = await Promise.all(
      ids.map((id) =>
        fetch(`${API_URL}/api/${resource}/${id}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        })
      )
    );

    const data = await Promise.all(responses.map((response) => response.json()));

    return {
      data: data.map((item) => item.data || item),
    };
  },

  // Custom method for getting API info
  custom: async ({ url, method, payload, query, headers }) => {
    let requestUrl = `${API_URL}${url}`;

    if (query) {
      const queryParams = new URLSearchParams(query);
      requestUrl = `${requestUrl}?${queryParams.toString()}`;
    }

    const response = await fetch(requestUrl, {
      method: method || "GET",
      body: payload ? JSON.stringify(payload) : undefined,
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      data: data.data || data,
    };
  },
};
