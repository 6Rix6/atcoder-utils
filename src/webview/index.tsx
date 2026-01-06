import { createRoot } from "react-dom/client";
import React from "react";
import "./index.css";

import App from "./apps/App";

const root = createRoot(document.getElementById("app")!);
root.render(<App />);
