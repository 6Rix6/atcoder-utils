import { createRoot } from "react-dom/client";
import React, { lazy, Suspense } from "react";
import { Loader } from "./components/elements";
import "./styles/globals.css";
import "./styles/scrollbar.css";

const App = lazy(() => import("./apps/App"));
const MultiTestApp = lazy(() => import("./apps/MultiTestApp"));
const AtCoderProblemApp = lazy(() => import("./apps/AtCoderProblemApp"));
const AtCoderContestApp = lazy(() => import("./apps/AtCoderContestApp"));

declare global {
  interface Window {
    __APP_TYPE__?: string;
  }
}

const appType = window.__APP_TYPE__ || "default";

const AppComponent = () => {
  switch (appType) {
    case "multi-test":
      return <MultiTestApp />;
    case "atcoder-problem":
      return <AtCoderProblemApp />;
    case "atcoder-contest":
      return <AtCoderContestApp />;
    default:
      return <App />;
  }
};

const root = createRoot(document.getElementById("app")!);
root.render(
  <Suspense fallback={<Loader />}>
    <AppComponent />
  </Suspense>,
);
