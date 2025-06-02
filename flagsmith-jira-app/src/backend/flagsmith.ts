import api, { APIResponse, Route, assumeTrustedRoute, route } from "@forge/api";

import { ApiArgs, ApiError, FLAGSMITH_API_V1 } from "../common";
import { readApiKey, readOrganisationId } from "./storage";

type Model = {
  id: number;
  name: string;
};

type PaginatedModels<TModel extends Model> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TModel[];
};

export type Organisation = Model;
export type Project = Model;
export type Environment = Model & { api_key: string; project: number };

export type Feature = Model & {
  id: number | string;
  description: string;
  archived_at: string | null;
  created_date: string;
  multivariate_options: unknown[];
  num_segment_overrides: number | null;
  num_identity_overrides: number | null;
  project: number;
  project_name: string;
};

export type EnvironmentFeatureState = Model & {
  id: number;
  feature_state_value: string | null;
  multivariate_feature_state_values: {
    id: number;
    multivariate_feature_option: number;
    percentage_allocation: number;
  }[];
  identity: number | null;
  deleted_at: string | null;
  uuid: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  live_from: string;
  version: number;
  feature: number;
  environment: number;
  feature_segment: number | null;
  change_request: number | null;
  environment_feature_version: number | null;
  name: string;
  api_key: string;
};

const flagsmithApi = async (
  apiKey: string,
  route: Route,
  { method = "GET", headers, body, codes = [], jsonResponse = true }: ApiArgs = {},
): Promise<unknown> => {
  try {
    const url = `${FLAGSMITH_API_V1}${route.value}`;
    if (process.env.DEBUG) console.debug(method, url);
    const response = await api.fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        // TODO later: change to Api-Key ${apiKey} to use RBAC tokens
        Authorization: `Token ${apiKey}`,
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
    // @ts-expect-error error.code may not exist
    throw new ApiError(error.message, error.code);
  }
};

const checkResponse = (response: APIResponse, ...codes: number[]): void => {
  if (!response.ok && !codes.includes(response.status)) {
    console.warn(response.status, response.statusText);
    throw new ApiError(
      `Unexpected Flagsmith API response: ${response.statusText}`,
      response.status,
    );
  }
};

const unpaginate = async <TModel extends Model>(
  apiKey: string,
  data: PaginatedModels<TModel>,
): Promise<TModel[]> => {
  let pageData = data;
  const results = pageData?.results ?? [];
  while (pageData.next) {
    const nextPath = assumeTrustedRoute(pageData.next.slice(FLAGSMITH_API_V1.length));
    pageData = (await flagsmithApi(apiKey, nextPath)) as PaginatedModels<TModel>;
    results.push(...(pageData?.results ?? []));
  }
  return results;
};

const checkApiKey = (apiKey: string): void => {
  if (!apiKey) throw new ApiError("Flagsmith API Key not set", 400);
};

export type ReadOrganisations = (args: { apiKey?: string }) => Promise<Organisation[]>;

/** Read Flagsmith Organisations for stored/given API Key */
export const readOrganisations: ReadOrganisations = async ({ apiKey: givenApiKey }) => {
  const apiKey = givenApiKey ?? (await readApiKey());
  checkApiKey(apiKey);
  const path = route`/organisations/`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<Organisation>;
  const results = await unpaginate(apiKey, data);
  if (results.length === 0) throw new ApiError("Flagsmith user has no organisations", 404);
  return results;
};

export type ReadProjects = (args: { organisationId?: string }) => Promise<Project[]>;

/** Read Flagsmith Projects for stored API Key and stored/given Organisation ID */
export const readProjects: ReadProjects = async ({ organisationId: givenOrganisationId }) => {
  const apiKey = await readApiKey();
  checkApiKey(apiKey);
  const organisationId = givenOrganisationId ?? (await readOrganisationId());
  if (!organisationId) throw new ApiError("Flagsmith organisation not connected", 400);
  const path = route`/projects/?organisation=${organisationId}`;
  const data = (await flagsmithApi(apiKey, path)) as Project[];
  // do not unpaginate as this API does not do pagination
  const results = data ?? [];
  if (results.length === 0) throw new ApiError("Flagsmith organisation has no projects", 404);
  return results;
};

export type ReadEnvironments = (args: { projectId?: string }) => Promise<Environment[]>;

/** Read Flagsmith Environments for stored API Key and given Project ID */
export const readEnvironments: ReadEnvironments = async ({ projectId }) => {
  const apiKey = await readApiKey();
  checkApiKey(apiKey);
  if (!projectId) throw new ApiError("Flagsmith project not connected", 400);
  const path = route`/environments/?project=${projectId}`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<Environment>;
  const results = await unpaginate(apiKey, data);
  if (results.length === 0) throw new ApiError("Flagsmith project has no environments", 404);
  return results;
};

export type ReadFeatures = (args: {
  projectIds?: string[];
  environmentId?: string;
}) => Promise<Feature[]>;

/** Read Flagsmith Features for stored API Key, given Project ID and optional Environment ID */
export const readFeatures: ReadFeatures = async ({ projectIds, environmentId }) => {
  const apiKey = await readApiKey();
  checkApiKey(apiKey);

  if (!projectIds || projectIds.length === 0) {
    throw new ApiError("Flagsmith project not connected", 400);
  }

  const allFeatures: Feature[] = [];
  const organisationId = await readOrganisationId();
  const projects = await readProjects({ organisationId });

  for (const projectId of projectIds) {
    const params = new URLSearchParams({ is_archived: "false" });
    if (environmentId) params.set("environment", environmentId);

    try {
      const project = projects.find((p) => String(p.id) === String(projectId));

      if (!project) {
        throw new ApiError(`Flagsmith project ${projectId} not found`, 404);
      }

      const path = route`/projects/${projectId}/features/?${params}`;
      const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<Feature>;
      const results = await unpaginate(apiKey, data);

      const enrichedFeatures = results.map((feature) => ({
        ...feature,
        project_name: project.name,
      }));

      allFeatures.push(...enrichedFeatures);
    } catch (error) {
      // If a specific project has no features, we can log it but continue with others
      if (error instanceof ApiError && error.code === 404) {
        console.warn(`Flagsmith project ${projectId} has no features`);
      } else {
        throw error; // rethrow unexpected errors
      }
    }
  }

  if (allFeatures.length === 0) {
    throw new ApiError("Flagsmith projects have no features", 404);
  }

  return allFeatures;
};

export type ReadEnvironmentFeatureState = (args: {
  envApiKey: string;
  featureName: string;
}) => Promise<EnvironmentFeatureState>;

/** Read Flagsmith Feature State for stored API Key and given Environment API Key and Feature Name */
export const readEnvironmentFeatureState: ReadEnvironmentFeatureState = async ({
  envApiKey,
  featureName,
}) => {
  const apiKey = await readApiKey();
  checkApiKey(apiKey);
  if (!envApiKey) throw new ApiError("Flagsmith environment not connected", 400);

  const path = route`/environments/${envApiKey}/featurestates/?feature_name=${featureName}`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<EnvironmentFeatureState>;
  const results = await unpaginate(apiKey, data);
  if (results.length === 0) {
    throw new ApiError("Flagsmith project has no features", 404);
  } else {
    return results[0] as EnvironmentFeatureState;
  }
};
