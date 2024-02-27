import api, { APIResponse, Route, assumeTrustedRoute, route } from "@forge/api";

import { ApiArgs, ApiError } from "./common";

type Model = {
  id: number;
  name: string;
};

export type OrganisationModel = Model;
export type ProjectModel = Model;

export type EnvironmentModel = Model & { api_key: string };

export type FeatureModel = Model & {
  id: number | string;
  description: string;
  archived_at: string | null;
  created_date: string;
};

export type FeatureStateValue = {
  string_value: string | null;
  boolean_value: boolean | null;
  integer_value: number | null;
};

export type FlagModel = Model & {
  id: number | string;
  feature_state_value: string | number | boolean;
  environment: number;
  identity: string | null;
  feature_segment: number | null;
  enabled: boolean;
  feature: FeatureModel;
};

type PaginatedModels<TModel extends Model> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: TModel[];
};

// TODO later: these could be set from environment variables for self-hosted users
const FLAGSMITH_API_V1 = "https://api.flagsmith.com/api/v1";
export const FLAGSMITH_APP = "https://app.flagsmith.com";

const flagsmithApi = async (
  apiKey: string,
  route: Route,
  envAPIKey: string | null = null,
  { method = "GET", headers, body, codes = [], jsonResponse = true }: ApiArgs = {},
): Promise<unknown> => {
  try {
    const url = `${FLAGSMITH_API_V1}${route.value}`;
    if (process.env.DEBUG) console.debug(method, url);
    const baseHeaders = {
      Accept: "application/json",
      Authorization: `Token ${apiKey}`,
      ...headers,
    };

    const requestHeaders = envAPIKey
      ? { ...baseHeaders, "x-environment-key": envAPIKey }
      : baseHeaders;
    const response = await api.fetch(url, {
      method,
      headers: requestHeaders,
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
    const nextPath = assumeTrustedRoute(pageData.next.slice(FLAGSMITH_API_V1.length));
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
  const path = route`/features/get-latest-features/${projectId}/`;
  const data = (await flagsmithApi(apiKey, path)) as PaginatedModels<FeatureModel>;
  const results = await unpaginate(apiKey, data);
  if (results.length === 0) throw new ApiError("Flagsmith project has no features", 404);
  return results;
};

export const fetchFlags = async ({
  apiKey,
  featureName,
  envAPIKey,
}: {
  apiKey: string;
  featureName: string;
  envAPIKey: string;
}): Promise<FlagModel> => {
  checkApiKey(apiKey);
  if (!featureName) throw new ApiError("Flagsmith environment not configured", 400);
  const path = route`/flags/?feature=${featureName}`;
  const data = (await flagsmithApi(apiKey, path, envAPIKey)) as FlagModel;
  return data;
};
