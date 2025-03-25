import { ExtensionData } from "@forge/react/out/types";

import { CanEditIssue } from "../backend/auth";
import { customInvoke } from "./invoke";

/** Check if user can edit a Jira issue */
export const canEditIssue: CanEditIssue = async (extension: ExtensionData): Promise<boolean> =>
  customInvoke("canEditIssue", extension);
