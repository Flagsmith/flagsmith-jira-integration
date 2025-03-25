import ForgeReconciler from "@forge/react";
import React from "react";

import AppSettingsPage from "./components/AppSettingsPage";
import ErrorWrapper from "./components/ErrorWrapper";

ForgeReconciler.render(
  <React.StrictMode>
    <ErrorWrapper renderChild={(setError) => <AppSettingsPage setError={setError} />} />
  </React.StrictMode>,
);
