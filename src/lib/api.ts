


// const API_URL = "http://localhost:4500";

// export type BackendComponent = {
//   _id?: string;
//   sku: string;
//   name: string;
//   category:
//     | "Microcontroller"
//     | "Sensors"
//     | "Prototyping"
//     | "Passive"
//     | "Power"
//     | "Connector";
//   price: number;
//   stock: number;
//   description: string;
//   details: string;
//   image?: string;
// };

// export type ComponentFormData = {
//   sku: string;
//   name: string;
//   category: BackendComponent["category"];
//   price: number;
//   stock: number;
//   description: string;
//   details: string;
//   image?: string;
//   imageFile?: File | null;
// };

// async function handleResponse<T>(res: Response): Promise<T> {
//   const contentType = res.headers.get("content-type");

//   if (!res.ok) {
//     let message = `Request failed with status ${res.status}`;

//     if (contentType?.includes("application/json")) {
//       const errorData = await res.json();
//       message = errorData.message || message;
//     } else {
//       const text = await res.text();

//       if (text) {
//         message = text;
//       }
//     }

//     throw new Error(message);
//   }

//   if (!contentType?.includes("application/json")) {
//     throw new Error("Server did not return JSON.");
//   }

//   return res.json();
// }

// const createFormData = (data: ComponentFormData) => {
//   const formData = new FormData();

//   formData.append("sku", data.sku);
//   formData.append("name", data.name);
//   formData.append("category", data.category);
//   formData.append("price", String(data.price));
//   formData.append("stock", String(data.stock));
//   formData.append("description", data.description);
//   formData.append("details", data.details || "");

//   if (data.imageFile) {
//     formData.append("image", data.imageFile);
//   }

//   return formData;
// };

// export const componentApi = {
//   // GET ALL
//   getAll: async (): Promise<BackendComponent[]> => {
//     const res = await fetch(`${API_URL}/admin/getcomponents`);

//     return handleResponse<BackendComponent[]>(res);
//   },

//   // GET ONE
//   getOne: async (id: string): Promise<BackendComponent> => {
//     const res = await fetch(
//       `${API_URL}/admin/components/${id}`
//     );

//     return handleResponse<BackendComponent>(res);
//   },

//   // CREATE
//   create: async (
//     data: ComponentFormData
//   ): Promise<BackendComponent> => {
//     const formData = createFormData(data);

//     const res = await fetch(`${API_URL}/admin/create-components`, {
//       method: "POST",
//       body: formData,
//     });

//     return handleResponse<BackendComponent>(res);
//   },

//   // UPDATE
//   update: async (
//     id: string,
//     data: ComponentFormData
//   ): Promise<BackendComponent> => {
//     const formData = createFormData(data);

//     const res = await fetch(
//       `${API_URL}/admin/components/${id}`,
//       {
//         method: "PUT",
//         body: formData,
//       }
//     );

//     return handleResponse<BackendComponent>(res);
//   },

//   // DELETE
//   delete: async (
//     id: string
//   ): Promise<{
//     message: string;
//     component?: BackendComponent;
//   }> => {
//     const res = await fetch(
//       `${API_URL}/admin/components/${id}`,
//       {
//         method: "DELETE",
//       }
//     );

//     return handleResponse(res);
//   },
// };

const API_URL = "http://localhost:4500";

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
  stock: number;
  description: string;
  details: string;
  image?: string;
};

type ComponentData = Omit<BackendComponent, "_id" | "image">;

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type");

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;

    if (contentType?.includes("application/json")) {
      const errorData = await res.json();
      message = errorData.message || message;
    } else {
      const text = await res.text();

      if (text) {
        message = text;
      }
    }

    throw new Error(message);
  }

  if (!contentType?.includes("application/json")) {
    throw new Error("Server did not return JSON.");
  }

  return res.json();
}

/*
 * Convert component data + image into FormData
 */
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

export const componentApi = {
  /*
   * GET ALL COMPONENTS
   */
  getAll: async (): Promise<BackendComponent[]> => {
    const res = await fetch(
      `${API_URL}/admin/getcomponents`
    );

    return handleResponse<BackendComponent[]>(res);
  },

  /*
   * GET ONE COMPONENT
   */
  getOne: async (
    id: string
  ): Promise<BackendComponent> => {
    const res = await fetch(
      `${API_URL}/admin/getonecomponent/${id}`
    );

    return handleResponse<BackendComponent>(res);
  },

  /*
   * CREATE COMPONENT
   */
  create: async (
    data: ComponentData,
    imageFile?: File | null
  ): Promise<BackendComponent> => {
    const formData = createFormData(
      data,
      imageFile
    );

    const res = await fetch(
      `${API_URL}/admin/create-components`,
      {
        method: "POST",
        body: formData,
      }
    );

    return handleResponse<BackendComponent>(res);
  },

  /*
   * UPDATE COMPONENT
   */
  update: async (
    id: string,
    data: ComponentData,
    imageFile?: File | null
  ): Promise<BackendComponent> => {
    const formData = createFormData(
      data,
      imageFile
    );

    const res = await fetch(
      `${API_URL}/admin/update-component/${id}`,
      {
        method: "PUT",
        body: formData,
      }
    );

    return handleResponse<BackendComponent>(res);
  },

  /*
   * DELETE COMPONENT
   */
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
      }
    );

    return handleResponse(res);
  },
};

// export const cartApi = {
//   add: async (
//     componentId: string,
//     quantity = 1
//   ) => {
//     const token =
//       sessionStorage.getItem("pulselab_token");

//     const response = await fetch(
//       // "http://localhost:4500/cart",
//       `${API_URL}/engineering/addtocart`,
//       {
//         method: "POST",

//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },

//         body: JSON.stringify({
//           componentId,
//           quantity,
//         }),
//       }
//     );

//     if (!response.ok) {
//       const error = await response.json();

//       throw new Error(
//         error.message || "Failed to add to cart"
//       );
//     }

//     return response.json();
//   },
// };