# Model Management API Design

## 1. Introduction

To effectively manage a diverse set of large language models (LLMs), a robust Model Management API is essential. This API provides a standardized interface for administrators to register, configure, update, and monitor all available models within the system. This centralization simplifies the integration of new models and ensures consistent management practices.

## 2. Data Model: The `Model` Object

The core of the API is the `Model` object, which represents a single LLM instance. Its structure is as follows:


{
  "model_id": "string",         // Unique identifier (e.g., "openai-gpt-4o")
  "name": "string",             // User-friendly display name (e.g., "GPT-4o")
  "provider": "string",        // The source of the model (e.g., "OpenAI", "Anthropic", "Google", "Local")
  "type": "string",            // Model type (e.g., "chat", "embedding", "image_generation")
  "api_key_name": "string",    // The name of the environment variable holding the API key
  "capabilities": [
    "function_calling",
    "json_mode",
    "vision"
  ],
  "performance_metrics": {
    "avg_latency_ms": "integer", // Average latency in milliseconds
    "cost_per_1k_tokens": {
      "input": "float",        // Cost for 1000 input tokens
      "output": "float"       // Cost for 1000 output tokens
    }
  },
  "status": "string",          // Current status ("active", "inactive", "maintenance")
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

## 3. API Endpoints

All endpoints are prefixed with `/api/v1`.

### 3.1. List Models

- **Endpoint:** `GET /models`
- **Description:** Retrieves a list of all registered models.
- **Query Parameters:**
  - `status` (optional): Filter by status (e.g., `active`).
  - `provider` (optional): Filter by provider.
- **Success Response (200 OK):**
  
  {
    "models": [ ... ] // Array of Model objects
  }
  ```

### 3.2. Add a New Model

- **Endpoint:** `POST /models`
- **Description:** Registers a new model in the system.
- **Request Body:** A `Model` object (excluding read-only fields like `created_at`).
- **Success Response (201 Created):** The newly created `Model` object.

### 3.3. Get Model Details

- **Endpoint:** `GET /models/{model_id}`
- **Description:** Retrieves the details of a specific model.
- **Success Response (200 OK):** The corresponding `Model` object.

### 3.4. Update a Model

- **Endpoint:** `PUT /models/{model_id}`
- **Description:** Updates the configuration of an existing model (e.g., changing its status or cost).
- **Request Body:** A `Model` object with the fields to be updated.
- **Success Response (200 OK):** The updated `Model` object.

### 3.5. Delete a Model

- **Endpoint:** `DELETE /models/{model_id}`
- **Description:** Deactivates or removes a model from the system. A soft delete (changing status to `inactive`) is recommended over a hard delete.
- **Success Response (204 No Content):**

## 4. Authentication

All API requests must be authenticated using a bearer token in the `Authorization` header. Access should be restricted to administrative roles.