import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootDomElement = document.getElementById("root")!;

createRoot(rootDomElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
