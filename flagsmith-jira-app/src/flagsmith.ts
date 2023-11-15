import api, { APIResponse, Route, assumeTrustedRoute, route } from "@forge/api";

import { ApiArgs, ApiError } from "./common";

type Model = {
  id: number;
  name: string;
};

export type OrganisationModel = Model;
export type ProjectModel = Model;
export type EnvironmentModel = Model;

export type FeatureModel = Model & {
  description: string;
  archived_at: string | null;
};

export type FeatureStateValue = {
  type: "unicode" | "int" | "bool" | string;
  string_value: string | null;
  boolean_value: boolean | null;
  integer_value: number | null;
};

export type FlagModel = Model & {
  enabled: boolean;
  feature: number;
  feature_segment: number | null;
  identity: number | null;
  feature_state_value: FeatureStateValue;
  multivariate_feature_state_values: unknown[];
  updated_at: string;
};

type PaginatedModels<TModel extends Model> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TModel[];
};

const API_V1 = "https://api.flagsmith.com/api/v1";

const flagsmithApi = async (
  apiKey: string,
  route: Route,
  { method = "GET", headers, body, codes = [], jsonResponse = true }: ApiArgs = {},
): Promise<unknown> => {
  try {
    const url = `${API_V1}${route.value}`;
    if (process.env.DEBUG) console.debug(method, url);
    const response = await api.fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        // TODO change to Api-Key ${apiKey} (for RBAC tokens) before official release
        Authorization: `Token ${apiKey}`,
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
    // @ts-expect-error error.code may not exist
    throw new ApiError(error.message, error.code);
  }
};

const checkResponse = (response: APIResponse, ...codes: number[]): void => {
  if (!response.ok && !codes.includes(response.status)) {
    console.warn(response.status, response.statusText);
    throw new ApiError("Unexpected Flagsmith API response:", response.status);
  }
};

const unpaginate = async <TModel extends Model>(
  apiKey: string,
  data: PaginatedModels<TModel>,
): Promise<TModel[]> => {
  let pageData = data;
  const results = pageData?.results ?? [];
  while (pageData.next) {
    const nextPath = assumeTrustedRoute(pageData.next.slice(API_V1.length));
    pageData = (await flagsmithApi(apiKey, nextPath)) as PaginatedModels<TModel>;
    results.push(...(pageData?.results ?? []));
  }
  return results;
};

const checkApiKey = (apiKey: string): void => {
  if (!apiKey) throw new ApiError("Flagsmith API Key not configured", 400);
};

export const fetchOrganisations = async ({
  apiKey,
}: {
  apiKey: string;
}): Promise<OrganisationModel[]> => {
  checkApiKey(apiKey);
  const path = route`/organisations/`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<OrganisationModel>;
  const results = await unpaginate(apiKey, data);
  if (results.length === 0) throw new ApiError("Flagsmith user has no organisations", 404);
  return results;
};

export const fetchProjects = async ({
  apiKey,
  organisationId,
}: {
  apiKey: string;
  organisationId: string | undefined;
}): Promise<ProjectModel[]> => {
  checkApiKey(apiKey);
  if (!organisationId) throw new ApiError("Flagsmith organisation not configured", 400);
  const path = route`/projects/?organisation=${organisationId}`;
  const data = (await flagsmithApi(apiKey, path)) as ProjectModel[];
  // do not unpaginate as this API does not do pagination
  const results = data ?? [];
  if (results.length === 0) throw new ApiError("Flagsmith organisation has no projects", 404);
  return results;
};

export const fetchEnvironments = async ({
  apiKey,
  projectId,
}: {
  apiKey: string;
  projectId: string | undefined;
}): Promise<EnvironmentModel[]> => {
  checkApiKey(apiKey);
  if (!projectId) throw new ApiError("Flagsmith project not configured", 400);
  const path = route`/environments/?project=${projectId}`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<EnvironmentModel>;
  const results = await unpaginate(apiKey, data);
  if (results.length === 0) throw new ApiError("Flagsmith project has no environments", 404);
  return results;
};

export const fetchFeatures = async ({
  apiKey,
  projectId,
}: {
  apiKey: string;
  projectId: string | undefined;
}): Promise<FeatureModel[]> => {
  checkApiKey(apiKey);
  if (!projectId) throw new ApiError("Flagsmith project not configured", 400);
  const path = route`/projects/${projectId}/features/`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<FeatureModel>;
  const results = await unpaginate(apiKey, data);
  if (results.length === 0) throw new ApiError("Flagsmith project has no features", 404);
  return results;
};

export const fetchFlags = async ({
  apiKey,
  environmentId,
}: {
  apiKey: string;
  environmentId: string | undefined;
}): Promise<FlagModel[]> => {
  checkApiKey(apiKey);
  if (!environmentId) throw new ApiError("Flagsmith environment not configured", 400);
  const path = route`/features/featurestates/?environment=${environmentId}`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<FlagModel>;
  return await unpaginate(apiKey, data);
};
