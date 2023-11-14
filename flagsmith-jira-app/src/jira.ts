import api, { APIResponse, route } from "@forge/api";
import { JiraContext } from "@forge/ui";

import { ApiError } from "./common";

type EntityType = "project" | "issue";

const checkResponse = (response: APIResponse): void => {
  if (!response.ok) {
    throw new ApiError("Unexpected Jira API response", response.status);
  }
};

const getEntityPermission = async (
  entityType: EntityType,
  jiraContext: JiraContext,
  ...permissionKeys: string[]
): Promise<boolean> => {
  const entityId = String(jiraContext[`${entityType}Id`]);
  console.debug(`getEntityPermission(${entityId}, ${permissionKeys})`);
  const permissions = permissionKeys.join(",");
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/mypermissions?${entityType}Id=${entityId}&permissions=${permissions}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
  checkResponse(response);
  const data = await response.json();
  console.debug(data);
  return permissionKeys.some((permissionKey) => data?.permissions?.[permissionKey]?.havePermission);
};

export const canAdminProject = async (jiraContext: JiraContext): Promise<boolean> =>
  await getEntityPermission("project", jiraContext, "ADMINISTER", "ADMINISTER_PROJECTS");

export const canEditIssue = async (jiraContext: JiraContext): Promise<boolean> =>
  await getEntityPermission("issue", jiraContext, "EDIT_ISSUES");

const getEntityProperty = async <T>(
  entityType: EntityType,
  jiraContext: JiraContext,
  propertyKey: string,
): Promise<T | undefined> => {
  const entityId = String(jiraContext[`${entityType}Id`]);
  console.debug(`getEntityProperty(${entityId}, ${propertyKey})`);
  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
      headers: {
        Accept: "application/json",
      },
    });
  checkResponse(response);
  const data = await response.json();
  console.debug(data);
  return data?.value;
};

const setEntityProperty = async <T>(
  entityType: EntityType,
  jiraContext: JiraContext,
  propertyKey: string,
  value: T,
): Promise<void> => {
  const entityId = String(jiraContext[`${entityType}Id`]);
  console.debug(`setEntityProperty(${entityId}, ${propertyKey}, ${value})`);
  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    });
  checkResponse(response);
  const data = await response.text();
  console.debug(data);
};

const deleteEntityProperty = async (
  entityType: EntityType,
  jiraContext: JiraContext,
  propertyKey: string,
): Promise<void> => {
  const entityId = String(jiraContext[`${entityType}Id`]);
  console.debug(`deleteEntityProperty(${entityId}, ${propertyKey}`);
  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  checkResponse(response);
  const data = await response.text();
  console.debug(data);
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
