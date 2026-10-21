import { apiRequest } from "./apiClient";

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
// FORMDATA
// =====================================================
// Do NOT set Content-Type manually — the browser adds
// the multipart boundary when we pass a FormData body.
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
// API
// =====================================================
export const componentApi = {
  // ==============================================
  // GET ALL (admin inventory table)
  // ==============================================
  getAll: async (
    signal?: AbortSignal
  ): Promise<BackendComponent[]> => {
    const data = await apiRequest<
      BackendComponent[] | { components: BackendComponent[] }
    >("/admin/getcomponents", { auth: "admin", signal });

    // Handle both bare array and wrapped shape.
    if (Array.isArray(data)) return data;

    if (data && Array.isArray((data as any).components)) {
      return (data as any).components;
    }

    return [];
  },

  // ==============================================
  // GET PAGINATED (public catalog)
  // ==============================================
  getPage: async (
    params: ComponentPageParams = {}
  ): Promise<PaginatedComponentsResponse> => {
    const data = await apiRequest<PaginatedComponentsResponse>(
      "/engineering/components",
      {
        query: {
          page: params.page,
          limit: params.limit,
          sort: params.sort,
          order: params.order,
          search: params.search?.trim(),
          category:
            params.category && params.category !== "All"
              ? params.category
              : undefined,
        },
        signal: params.signal,
      }
    );

    if (
      !data ||
      data.success !== true ||
      !Array.isArray(data.data) ||
      !data.pagination
    ) {
      throw new Error("Unexpected response from the component service.");
    }

    return data;
  },

  // ==============================================
  // GET ONE
  // ==============================================
  getOne: async (
    id: string,
    signal?: AbortSignal
  ): Promise<BackendComponent> => {
    if (!id || id === "undefined" || id === "null") {
      throw new Error("Invalid component ID.");
    }

    return apiRequest<BackendComponent>(
      `/admin/getonecomponent/${id}`,
      { auth: "admin", signal }
    );
  },

  // ==============================================
  // CREATE
  // ==============================================
  create: async (
    data: ComponentData,
    imageFile?: File | null
  ): Promise<BackendComponent> => {
    const response = await apiRequest<
      BackendComponent | { component: BackendComponent }
    >("/admin/create-components", {
      method: "POST",
      auth: "admin",
      body: createFormData(data, imageFile),
      timeoutMs: 30_000,
    });

    const component =
      (response as any)?.component ?? (response as BackendComponent);

    if (!component?._id) {
      throw new Error("Server did not return the created component.");
    }

    return component;
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

    const response = await apiRequest<
      BackendComponent | { component: BackendComponent }
    >(`/admin/update-component/${id}`, {
      method: "PUT",
      auth: "admin",
      body: createFormData(data, imageFile),
      timeoutMs: 30_000,
    });

    const component =
      (response as any)?.component ?? (response as BackendComponent);

    if (!component?._id) {
      throw new Error("Server did not return the updated component.");
    }

    return component;
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

    return apiRequest(`/admin/delete-component/${id}`, {
      method: "DELETE",
      auth: "admin",
    });
  },
};
