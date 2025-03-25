import ForgeReconciler from "@forge/react";
import React from "react";

import ProjectSettingsPage from "./components/ProjectSettingsPage";
import ErrorWrapper from "./components/ErrorWrapper";

ForgeReconciler.render(
  <React.StrictMode>
    <ErrorWrapper
      checkSettings="app"
      renderChild={(setError) => <ProjectSettingsPage setError={setError} />}
    />
  </React.StrictMode>,
);
