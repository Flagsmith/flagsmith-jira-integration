import api, { APIResponse, authorize, route, Route } from "@forge/api";
import { ExtensionData } from "@forge/react/out/types";

import { ApiArgs, ApiError } from "../common";

const jiraApi = async (
  route: Route,
  { method = "GET", headers, body, codes = [], jsonResponse = true }: ApiArgs = {},
): Promise<unknown> => {
  try {
    if (process.env.DEBUG) console.debug(method, route.value);
    const response = await api.asUser().requestJira(route, {
      method,
      headers: {
        Accept: "application/json",
        ...headers,
      },
      ...(body ? { body } : {}),
    });
    checkResponse(response, ...codes);
    const data = await (jsonResponse ? response.json() : response.text());
    if (process.env.DEBUG) console.debug(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(error);
    // rethrow expected errors
    if (error instanceof ApiError) throw error;
    // wrap unexpected errors
    // @ts-expect-error error.code may not exist
    throw new ApiError(error.message, error.code);
  }
};

const checkResponse = (response: APIResponse, ...codes: number[]): void => {
  if (!response.ok && !codes.includes(response.status)) {
    console.warn(response.status, response.statusText);
    throw new ApiError("Unexpected Jira API response:", response.status);
  }
};

export type CanEditIssue = (extension: ExtensionData) => Promise<boolean>;

/** Check if user can edit a Jira issue */
export const canEditIssue: CanEditIssue = async (extension: ExtensionData): Promise<boolean> => {
  const entityType = "issue";
  const issueId = String(extension[entityType].id);
  return !!(await authorize().onJiraIssue(issueId).canEdit?.());
};

const hasPermission = async (permission: string): Promise<boolean> => {
  const data = (await jiraApi(route`/rest/api/3/mypermissions?permissions=${permission}`)) as {
    permissions: { [key: string]: { [key: string]: string } } | undefined;
  };
  return !!data.permissions?.[permission]?.havePermission;
};

/** Check if user can access app settings */
export const canAdministrate = async () => hasPermission("ADMINISTER");

/** Check if user can access project settings */
export const canAdministrateProject = async () => hasPermission("ADMINISTER_PROJECTS");
