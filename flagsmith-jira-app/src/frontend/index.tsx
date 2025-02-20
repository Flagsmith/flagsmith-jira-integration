import ForgeUI, { render } from "@forge/ui";

import AppSettingsPage from "./AppSettingsPage";
import IssueFlagPanel from "./IssueFlagPanel";
import ProjectSettingsPage from "./ProjectSettingsPage";

// dummy call to stop the linter removing JSX-enabling import
ForgeUI;

export const runAppSettingsPage = render(<AppSettingsPage />);
export const runProjectSettingsPage = render(<ProjectSettingsPage />);
export const runIssueFlagPanel = render(<IssueFlagPanel />);
