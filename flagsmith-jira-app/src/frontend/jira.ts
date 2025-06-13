import type { APIResponse } from "@forge/api";
import { requestJira } from "@forge/bridge";
import { ExtensionData } from "@forge/react/out/types";

import { ApiArgs, ApiError } from "../common";

export type EntityType = "project" | "issue";

const jiraApi = async (
  restPath: string,
  { method = "GET", headers, body, codes = [], jsonResponse = true }: ApiArgs = {},
): Promise<unknown> => {
  try {
    // if (process.env.DEBUG) console.debug(method, restPath);
    const response = await requestJira(restPath, {
      method,
      headers: {
        Accept: "application/json",
        ...headers,
      },
      ...(body ? { body } : {}),
    });
    checkResponse(response, ...codes);
    const data = await (jsonResponse ? response.json() : response.text());
    // if (process.env.DEBUG) console.debug(JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
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
    throw new ApiError(`Unexpected Jira API response: ${response.statusText}`, response.status);
  }
};

const getEntityProperty = async <T>(
  entityType: EntityType,
  entityId: string,
  propertyKey: string,
): Promise<T | undefined> => {
  const data = (await jiraApi(`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
    codes: [404],
  })) as { value?: T };
  return data?.value;
};

const setEntityProperty = async <T>(
  entityType: EntityType,
  entityId: string,
  propertyKey: string,
  value: T,
): Promise<void> => {
  await jiraApi(`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
    method: "PUT",
    body: JSON.stringify(value),
    jsonResponse: false,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

const deleteEntityProperty = async (
  entityType: EntityType,
  entityId: string,
  propertyKey: string,
): Promise<void> => {
  await jiraApi(`/rest/api/3/${entityType}/${entityId}/properties/${propertyKey}`, {
    method: "DELETE",
    codes: [404], // Jira DELETE is not idempotent :/
    jsonResponse: false,
  });
};

const PROJECT_IDS = "flagsmith.project";
const FEATURE_IDS = "flagsmith.features";

/** Read Flagsmith Project IDs stored on Jira Project */
export const readProjectIds = async (extension: ExtensionData): Promise<string[]> => {
  const entityType = "project";
  const entityId = String(extension[entityType].id);
  const stored = await getEntityProperty(entityType, entityId, PROJECT_IDS);

  if (!stored) {
    return [];
  }

  if (typeof stored === "string") {
    return [stored]; // Wrap single string in array
  }

  if (Array.isArray(stored)) {
    return stored; // Already an array, perfect
  }

  throw new Error(`Unexpected type for projectIds: ${typeof stored}`);
};

/** Write Flagsmith Project ID stored on Jira Project */
export const writeProjectIds = async (
  extension: ExtensionData,
  projectIds: string[],
): Promise<void> => {
  const entityType = "project";
  const entityId = String(extension[entityType].id);
  if (projectIds && projectIds.length > 0) {
    return await setEntityProperty(entityType, entityId, PROJECT_IDS, projectIds);
  } else {
    return await deleteEntityProperty(entityType, entityId, PROJECT_IDS);
  }
};

/** Read Flagsmith Feature IDs stored on Jira Issue */
export const readFeatureIds = async (extension: ExtensionData): Promise<string[]> => {
  const entityType = "issue";
  const entityId = String(extension[entityType].id);
  return (await getEntityProperty(entityType, entityId, FEATURE_IDS)) ?? [];
};

/** Write Flagsmith Feature IDs stored on Jira Issue */
export const writeFeatureIds = async (
  extension: ExtensionData,
  featureIds: string[],
): Promise<void> => {
  const entityType = "issue";
  const entityId = String(extension[entityType].id);
  if (featureIds.length) {
    return await setEntityProperty(entityType, entityId, FEATURE_IDS, featureIds);
  } else {
    return await deleteEntityProperty(entityType, entityId, FEATURE_IDS);
  }
};
