import React from "react";
import { createRoot } from "react-dom/client";
import MultiTestApp from "./MultiTestApp";
import "./index.css";

const container = document.getElementById("app");
const root = createRoot(container!);
root.render(<MultiTestApp />);
