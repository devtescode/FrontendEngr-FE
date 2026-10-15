const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4500";

export type BackendComponent = {
  _id?: string;
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
};

type ComponentData = Omit<BackendComponent, "_id" | "image">;

// =====================================================
// AUTH
// =====================================================
const getToken = () =>
  sessionStorage.getItem("admin_token") ||
  sessionStorage.getItem("pulselab_admin_token") ||
  sessionStorage.getItem("pulselab_token");

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
      const errorData = await res.json().catch(() => null);
      message = errorData?.message || message;
    } else {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }

    throw new Error(message);
  }

  // Empty success responses (204, or 200 with no body)
  if (res.status === 204) {
    return undefined as T;
  }

  if (!contentType?.includes("application/json")) {
    const text = await res.text().catch(() => "");
    if (!text) return undefined as T;
    throw new Error("Server did not return JSON.");
  }

  return res.json();
}

// =====================================================
// FORMDATA BUILDER
// =====================================================
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
// API
// =====================================================
export const componentApi = {
  // ================================================
  // GET ALL COMPONENTS
  // ================================================
  getAll: async (): Promise<BackendComponent[]> => {
    const res = await fetch(
      `${API_URL}/admin/getcomponents`,
      { headers: authHeaders() }
    );

    const data = await handleResponse<
      BackendComponent[] | { components: BackendComponent[] }
    >(res);

    // Support both response shapes.
    if (Array.isArray(data)) return data;

    if (data && Array.isArray(data.components)) {
      return data.components;
    }

    throw new Error("Unexpected components response shape");
  },

  // ================================================
  // GET ONE COMPONENT
  // ================================================
  getOne: async (
    id: string
  ): Promise<BackendComponent> => {
    const res = await fetch(
      `${API_URL}/admin/getonecomponent/${id}`,
      { headers: authHeaders() }
    );

    return handleResponse<BackendComponent>(res);
  },

  // ================================================
  // CREATE COMPONENT
  // ================================================
  create: async (
    data: ComponentData,
    imageFile?: File | null
  ): Promise<BackendComponent> => {
    const formData = createFormData(data, imageFile);

    const res = await fetch(
      `${API_URL}/admin/create-components`,
      {
        method: "POST",
        headers: authHeaders(), // no Content-Type — browser sets it
        body: formData,
      }
    );

    return handleResponse<BackendComponent>(res);
  },

  // ================================================
  // UPDATE COMPONENT
  // ================================================
  update: async (
    id: string,
    data: ComponentData,
    imageFile?: File | null
  ): Promise<BackendComponent> => {
    const formData = createFormData(data, imageFile);

    const res = await fetch(
      `${API_URL}/admin/update-component/${id}`,
      {
        method: "PUT",
        headers: authHeaders(),
        body: formData,
      }
    );

    return handleResponse<BackendComponent>(res);
  },

  // ================================================
  // DELETE COMPONENT
  // ================================================
  delete: async (
    id: string
  ): Promise<{
    message: string;
    component?: BackendComponent;
  }> => {
    const res = await fetch(
      `${API_URL}/admin/delete-component/${id}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      }
    );

    return handleResponse(res);
  },
};