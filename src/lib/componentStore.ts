import type { Component } from "@/lib/data";
import type { BackendComponent } from "@/lib/api";
import { componentApi } from "@/lib/api";

export let componentsCache: Component[] = [];

let initialized = false;

export function normalizeComponent(
  component: BackendComponent
): Component {
  return {
    id: component._id,
    _id: component._id,
    sku: component.sku,
    name: component.name,
    category: component.category,
    price: component.price,
    stock: component.stock,
    description: component.description,
    details: component.details,
    image: component.image || "",
  };
}

export async function loadComponents() {
  if (initialized) {
    return componentsCache;
  }

  initialized = true;

  try {
    const response = await componentApi.getAll();

    componentsCache = response.map(
      normalizeComponent
    );

    return componentsCache;
  } catch (error) {
    initialized = false;
    throw error;
  }
}

export function setComponentsCache(
  components: Component[]
) {
  componentsCache = components;
}