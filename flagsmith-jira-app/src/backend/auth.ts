import { authorize } from "@forge/api";
import { ExtensionData } from "@forge/react/out/types";

export type CanEditIssue = (extension: ExtensionData) => Promise<boolean>;

/** Check if user can edit a Jira issue */
export const canEditIssue: CanEditIssue = async (extension: ExtensionData): Promise<boolean> => {
  const entityType = "issue";
  const issueId = String(extension[entityType].id);
  return !!(await authorize().onJiraIssue(issueId).canEdit?.());
};
