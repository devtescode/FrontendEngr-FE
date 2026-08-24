import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/bebas-neue/400.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

const router = getRouter();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

function App() {
  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);