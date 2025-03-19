import ForgeReconciler from "@forge/react";
import React from "react";

import IssueFeaturesPanel from "./components/IssueFeaturesPanel";
import ErrorWrapper from "./components/ErrorWrapper";

ForgeReconciler.render(
  <React.StrictMode>
    <ErrorWrapper renderChild={(setError) => <IssueFeaturesPanel setError={setError} />} />
  </React.StrictMode>
);
