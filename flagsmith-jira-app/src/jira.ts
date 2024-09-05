import api, { APIResponse, Route, authorize, route } from "@forge/api";
import { JiraContext } from "@forge/ui";

import { ApiArgs, ApiError } from "./common";

export const canEditIssue = async (jiraContext: JiraContext): Promise<boolean> =>
  !!(await authorize().onJiraIssue(String(jiraContext.issueId)).canEdit?.());

type EntityType = "project" | "issue";

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
      body,
    });
    checkResponse(response, ...codes);
    const data = await (jsonResponse ? response.json() : response.text());
    if (process.env.DEBUG) console.debug(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(error);
    if (!(error instanceof Error)) throw error;
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

const getEntityProperty = async <T>(
  entityType: EntityType,
  jiraContext: JiraContext,
  propertyKey: string,
): Promise<T | undefined> => {
  const entityId = String(jiraContext[`${entityType}Id`]);
  const data = (await jiraApi(
    route`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`,
    {
      codes: [404],
    },
  )) as { value?: T };
  return data?.value;
};

const setEntityProperty = async <T>(
  entityType: EntityType,
  jiraContext: JiraContext,
  propertyKey: string,
  value: T,
): Promise<void> => {
  const entityId = String(jiraContext[`${entityType}Id`]);
  await jiraApi(route`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
    method: "PUT",
    body: JSON.stringify(value),
    jsonResponse: false,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
  });
};

const deleteEntityProperty = async (
  entityType: EntityType,
  jiraContext: JiraContext,
  propertyKey: string,
): Promise<void> => {
  const entityId = String(jiraContext[`${entityType}Id`]);
  await jiraApi(route`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
    method: "DELETE",
    codes: [404], // Jira DELETE is not idempotent :/
    jsonResponse: false,
  });
};

const PROJECT_ID = "flagsmith.project";
const FEATURE_IDS = "flagsmith.features";

export const readProjectId = async (jiraContext: JiraContext): Promise<string | undefined> =>
  await getEntityProperty("project", jiraContext, PROJECT_ID);

export const writeProjectId = async (
  jiraContext: JiraContext,
  projectId: string | undefined,
): Promise<void> => {
  if (projectId) {
    return await setEntityProperty("project", jiraContext, PROJECT_ID, projectId);
  } else {
    return await deleteEntityProperty("project", jiraContext, PROJECT_ID);
  }
};

export const readFeatureIds = async (jiraContext: JiraContext): Promise<string[] | undefined> =>
  await getEntityProperty("issue", jiraContext, FEATURE_IDS);

export const writeFeatureIds = async (
  jiraContext: JiraContext,
  featureIds: string[],
): Promise<void> => {
  if (featureIds.length) {
    return await setEntityProperty("issue", jiraContext, FEATURE_IDS, featureIds);
  } else {
    return await deleteEntityProperty("issue", jiraContext, FEATURE_IDS);
  }
};
