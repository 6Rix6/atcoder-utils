import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/activity-tab.css";
import "./styles/scrollbar.css";

import AtCoderContestApp from "./apps/AtCoderContestApp";

const root = createRoot(document.getElementById("app")!);
root.render(<AtCoderContestApp />);
