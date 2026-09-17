import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { injectFontFaces } from "./fonts";
import "./index.css";

// Register the faces before anything tries to measure with them.
injectFontFaces();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
