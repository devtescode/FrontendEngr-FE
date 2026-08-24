import type { Component } from "@/lib/data";
import type { BackendComponent } from "@/lib/api";
import { componentApi } from "@/lib/api";

const STORAGE_KEY = "pulselab_components";

export let componentsCache: Component[] = [];

let initialized = false;

/*
 * =====================================================
 * LOAD SAVED COMPONENTS
 * =====================================================
 */

function getStoredComponents(): Component[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored =
      localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch (error) {
    console.error(
      "Failed to load cached components:",
      error
    );

    return [];
  }
}

/*
 * =====================================================
 * INITIAL CACHE
 * =====================================================
 *
 * Load localStorage immediately when the app starts.
 */

if (typeof window !== "undefined") {
  componentsCache =
    getStoredComponents();
}

/*
 * =====================================================
 * NORMALIZE COMPONENT
 * =====================================================
 */

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

/*
 * =====================================================
 * LOAD COMPONENTS
 * =====================================================
 */

export async function loadComponents() {
  /*
   * If the backend has already been loaded during
   * this session, use the current cache.
   */

  if (initialized) {
    return componentsCache;
  }

  initialized = true;

  try {
    /*
     * Fetch the latest components from backend.
     */

    const response =
      await componentApi.getAll();

    const freshComponents =
      response.map(
        normalizeComponent
      );

    /*
     * Update memory + localStorage.
     */

    setComponentsCache(
      freshComponents
    );

    return freshComponents;
  } catch (error) {
    initialized = false;

    /*
     * IMPORTANT:
     *
     * If backend fails but we already have
     * cached products, don't destroy them.
     */

    if (componentsCache.length > 0) {
      console.warn(
        "Using cached components because backend request failed."
      );

      return componentsCache;
    }

    throw error;
  }
}

/*
 * =====================================================
 * SET COMPONENT CACHE
 * =====================================================
 */

export function setComponentsCache(
  components: Component[]
) {
  /*
   * Update in-memory cache.
   */

  componentsCache = components;

  /*
   * Persist cache.
   */

  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(components)
    );
  } catch (error) {
    console.error(
      "Failed to save components cache:",
      error
    );
  }
}