const API_BASE_URL = "http://localhost:3011/api";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "ready" | "in_progress" | "review" | "done";
  createdAt: string;
  updatedAt: string;
}

export interface BatchDeleteResponse {
  message: string;
  deletedCount: number;
  deletedTasks: Task[];
  notFoundIds?: string[];
}

export const apiClient = {
  // Get all tasks
  async getTasks(): Promise<{ tasks: Task[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }
    return response.json();
  },

  // Get a single task
  async getTask(id: string): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch task");
    }
    return response.json();
  },

  // Create a new task
  async createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt">): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(task),
    });
    if (!response.ok) {
      throw new Error("Failed to create task");
    }
    return response.json();
  },

  // Update a task
  async updateTask(id: string, updates: Partial<Omit<Task, "id" | "createdAt">>): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error("Failed to update task");
    }
    return response.json();
  },

  // Delete a single task
  async deleteTask(id: string): Promise<{ message: string; task: Task }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to delete task");
    }
    return response.json();
  },

  // Batch delete tasks
  async batchDeleteTasks(ids: string[]): Promise<BatchDeleteResponse> {
    const response = await fetch(`${API_BASE_URL}/tasks/batch`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      throw new Error("Failed to batch delete tasks");
    }
    return response.json();
  },
};

export default apiClient;
