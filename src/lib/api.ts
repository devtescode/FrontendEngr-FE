import { API_BASE_URL } from "./config";

const API_URL = API_BASE_URL;

export type BackendComponent = {
  _id?: string;
  id?: string;
  sku: string;
  name: string;
  category:
    | "Microcontroller"
    | "Sensors"
    | "Prototyping"
    | "Passive"
    | "Power"
    | "Connector";
  price: number;
  soldCount?: number;
  stock: number;
  description: string;
  details: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ComponentSortField =
  | "createdAt"
  | "updatedAt"
  | "price"
  | "stock"
  | "soldCount"
  | "name"
  | "sku";

export type SortOrder = "asc" | "desc";

export type PaginationMeta = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedComponentsResponse = {
  success: boolean;
  data: BackendComponent[];
  pagination: PaginationMeta;
};

export type ComponentPageParams = {
  page?: number;
  limit?: number;
  sort?: ComponentSortField;
  order?: SortOrder;
  search?: string;
  category?: string;
  signal?: AbortSignal;
};

type ComponentData = Omit<
  BackendComponent,
  "_id" | "id" | "image" | "createdAt" | "updatedAt"
>;

// =====================================================
// AUTH
// =====================================================
function getToken(): string | null {
  return (
    sessionStorage.getItem("admin_token") ||
    sessionStorage.getItem("pulselab_admin_token") ||
    sessionStorage.getItem("pulselab_token") ||
    localStorage.getItem("admin_token") ||
    localStorage.getItem("pulselab_admin_token") ||
    null
  );
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// =====================================================
// RESPONSE HANDLER
// =====================================================
async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type");

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;

    if (contentType?.includes("application/json")) {
      const errorData = await res.json().catch((err) => {
        console.error("Failed to parse error response as JSON:", err);
        return null;
      });
      message = errorData?.message || message;
    } else {
      const text = await res.text().catch((err) => {
        console.error("Failed to read error response text:", err);
        return "";
      });
      if (text) message = text;
    }

    throw new Error(message);
  }

  // Empty success responses (204, or 200 with no body)
  if (res.status === 204) {
    return undefined as T;
  }

  if (!contentType?.includes("application/json")) {
    const text = await res.text().catch((err) => {
      console.error("Failed to read non-JSON response:", err);
      return "";
    });
    if (!text) return undefined as T;
    throw new Error("Server did not return JSON.");
  }

  return res.json();
}

// =====================================================
// FORMDATA
// =====================================================
// Do NOT set Content-Type manually — the browser adds
// the multipart boundary when you pass a FormData body.
//
function createFormData(
  data: ComponentData,
  imageFile?: File | null
) {
  const formData = new FormData();

  formData.append("sku", data.sku);
  formData.append("name", data.name);
  formData.append("category", data.category);
  formData.append("price", String(data.price));
  formData.append("stock", String(data.stock));
  formData.append("description", data.description);
  formData.append("details", data.details || "");

  if (imageFile) {
    formData.append("image", imageFile);
  }

  return formData;
}

// =====================================================
// TIMEOUT HELPER
// =====================================================
// Wraps an AbortController with a timeout so a hung
// request doesn't block the UI forever.
//
function withTimeout(ms: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abort, { once: true });
    }
  }

  const timer = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abort);
    },
  };
}

// =====================================================
// API
// =====================================================
export const componentApi = {
  // ==============================================
  // GET ALL
  // ==============================================
  getAll: async (): Promise<BackendComponent[]> => {
    const { signal, clear } = withTimeout(15000);

    try {
      const res = await fetch(`${API_URL}/admin/getcomponents`, {
        headers: authHeaders(),
        signal,
      });

      const data = await handleResponse<
        BackendComponent[] | { components: BackendComponent[] }
      >(res);

      // Handle both bare array and wrapped shape.
      if (Array.isArray(data)) return data;

      if (data && Array.isArray((data as any).components)) {
        return (data as any).components;
      }

      // If neither shape matches, log it but don't crash.
      console.warn(
        "getAll: unexpected response shape",
        data
      );
      return [];
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.error("getAll request aborted due to timeout");
        throw new Error(
          "Request timed out. Check your backend is running."
        );
      }
      console.error("getAll request failed:", err);
      throw err;
    } finally {
      clear();
    }
  },

  // ==============================================
  // GET PAGINATED (public catalog)
  // ==============================================
  getPage: async (
    params: ComponentPageParams = {}
  ): Promise<PaginatedComponentsResponse> => {
    const query = new URLSearchParams();

    if (params.page !== undefined) query.set("page", String(params.page));
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.sort) query.set("sort", params.sort);
    if (params.order) query.set("order", params.order);
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.category && params.category !== "All") {
      query.set("category", params.category);
    }

    const { signal, clear } = withTimeout(15000, params.signal);

    try {
      const res = await fetch(
        `${API_URL}/engineering/components?${query.toString()}`,
        {
          headers: { Accept: "application/json" },
          signal,
        }
      );

      const data = await handleResponse<PaginatedComponentsResponse>(res);

      if (
        !data ||
        data.success !== true ||
        !Array.isArray(data.data) ||
        !data.pagination
      ) {
        throw new Error("Unexpected response from the component service.");
      }

      return data;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // An external abort belongs to a newer request; let the caller ignore it.
        if (params.signal?.aborted) throw err;

        console.error("getPage request aborted due to timeout");
        throw new Error("Request timed out. Check your connection and try again.");
      }

      console.error("getPage request failed:", err);
      throw err;
    } finally {
      clear();
    }
  },

  // ==============================================
  // GET ONE
  // ==============================================
  getOne: async (id: string): Promise<BackendComponent> => {
    if (!id || id === "undefined" || id === "null") {
      throw new Error("Invalid component ID.");
    }

    const { signal, clear } = withTimeout(15000);

    try {
      const res = await fetch(
        `${API_URL}/admin/getonecomponent/${id}`,
        { headers: authHeaders(), signal }
      );

      return await handleResponse<BackendComponent>(res);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.error("getOne request aborted due to timeout");
        throw new Error("Request timed out.");
      }
      console.error("getOne request failed:", err);
      throw err;
    } finally {
      clear();
    }
  },

  // ==============================================
  // CREATE
  // ==============================================
  create: async (
    data: ComponentData,
    imageFile?: File | null
  ): Promise<BackendComponent> => {
    const formData = createFormData(data, imageFile);

    const { signal, clear } = withTimeout(30000); // longer for image upload

    try {
      const res = await fetch(
        `${API_URL}/admin/create-components`,
        {
          method: "POST",
          headers: authHeaders(), // token only, no Content-Type
          body: formData,
          signal,
        }
      );

      const response = await handleResponse<
        BackendComponent | { component: BackendComponent }
      >(res);

      const component =
        (response as any)?.component ??
        (response as BackendComponent);

      if (!component?._id) {
        throw new Error(
          "Server did not return the created component."
        );
      }

      return component;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.error("create request aborted due to timeout");
        throw new Error("Upload timed out. Try a smaller image.");
      }
      console.error("create request failed:", err);
      throw err;
    } finally {
      clear();
    }
  },

  // ==============================================
  // UPDATE
  // ==============================================
  update: async (
    id: string,
    data: ComponentData,
    imageFile?: File | null
  ): Promise<BackendComponent> => {
    if (!id || id === "undefined" || id === "null") {
      throw new Error("Invalid component ID.");
    }

    const formData = createFormData(data, imageFile);

    const { signal, clear } = withTimeout(30000);

    try {
      const res = await fetch(
        `${API_URL}/admin/update-component/${id}`,
        {
          method: "PUT",
          headers: authHeaders(),
          body: formData,
          signal,
        }
      );

      const response = await handleResponse<
        BackendComponent | { component: BackendComponent }
      >(res);

      const component =
        (response as any)?.component ??
        (response as BackendComponent);

      if (!component?._id) {
        throw new Error(
          "Server did not return the updated component."
        );
      }

      return component;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.error("update request aborted due to timeout");
        throw new Error("Upload timed out. Try a smaller image.");
      }
      console.error("update request failed:", err);
      throw err;
    } finally {
      clear();
    }
  },

  // ==============================================
  // DELETE
  // ==============================================
  delete: async (
    id: string
  ): Promise<{
    message: string;
    component?: BackendComponent;
  }> => {
    if (!id || id === "undefined" || id === "null") {
      throw new Error("Invalid component ID.");
    }

    const { signal, clear } = withTimeout(15000);

    try {
      const res = await fetch(
        `${API_URL}/admin/delete-component/${id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
          signal,
        }
      );

      return await handleResponse(res);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.error("delete request aborted due to timeout");
        throw new Error("Request timed out.");
      }
      console.error("delete request failed:", err);
      throw err;
    } finally {
      clear();
    }
  },
};