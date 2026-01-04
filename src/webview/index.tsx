import { createRoot } from "react-dom/client";
import App from "./App";
import React from "react";
// import "vscrui/dist/codicon.css";
import "./index.css";

const root = createRoot(document.getElementById("app")!);
root.render(<App />);
