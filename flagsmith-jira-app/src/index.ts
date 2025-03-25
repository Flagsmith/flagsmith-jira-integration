import Resolver from "@forge/resolver";

import { canEditIssue, canAdministrate, canAdministrateProject } from "./backend/auth";
import {
  readEnvironmentFeatureState,
  readEnvironments,
  readFeatures,
  readOrganisations,
  readProjects,
} from "./backend/flagsmith";
import {
  deleteApiKey,
  deleteOrganisationId,
  readApiKey,
  readOrganisationId,
  writeApiKey,
  writeOrganisationId,
} from "./backend/storage";
import { ApiError, ErrorPayload } from "./common";

/** Return errors and their properties to frontend without Forge mangling them */
const returnError = (error: Error): ErrorPayload => ({
  error: {
    ...error,
    message: error.message,
    name: error.name,
  },
});

const resolver = new Resolver();

resolver.define("canEditIssue", async ({ payload }) => canEditIssue(payload).catch(returnError));

const checkPermission = async (hasPermission: () => Promise<boolean>) => {
  if (!(await hasPermission())) throw new ApiError("Forbidden", 403);
};

resolver
  .define("readHasApiKey", async () =>
    checkPermission(canAdministrate)
      .then(readApiKey)
      .then((apiKey) => !!apiKey)
      .catch(returnError),
  )
  .define("readOrganisationId", async () =>
    checkPermission(canAdministrate).then(readOrganisationId).catch(returnError),
  );

resolver
  .define("writeApiKey", async ({ payload: { apiKey } }) =>
    checkPermission(canAdministrate)
      .then(() => writeApiKey({ apiKey }))
      .catch(returnError),
  )
  .define("writeOrganisationId", async ({ payload: { organisationId } }) =>
    checkPermission(canAdministrate)
      .then(() => writeOrganisationId({ organisationId }))
      .catch(returnError),
  );

resolver
  .define("deleteApiKey", async () =>
    checkPermission(canAdministrate)
      .then(() => deleteApiKey())
      .catch(returnError),
  )
  .define("deleteOrganisationId", async () =>
    checkPermission(canAdministrate)
      .then(() => deleteOrganisationId())
      .catch(returnError),
  );

resolver
  .define("readOrganisations", async ({ payload: { apiKey } }) =>
    checkPermission(canAdministrate)
      .then(() => readOrganisations({ apiKey }))
      .catch(returnError),
  )
  .define("readProjects", async ({ payload: { organisationId } }) =>
    // this API may be called with organisationId by administrators
    // this API may be called without organisationId by project administrators
    checkPermission(async () => (organisationId ? canAdministrate() : canAdministrateProject()))
      .then(() => readProjects({ organisationId }))
      .catch(returnError),
  )
  .define("readEnvironments", async ({ payload: { projectId } }) =>
    // this API may be called for projects in the current organisation
    // TODO later: consider caching or refactoring to reduce calls to readProjects (or use RBAC key)
    checkPermission(
      async () =>
        !projectId || (await readProjects({})).some((project) => String(project.id) === projectId),
    )
      .then(() => readEnvironments({ projectId }))
      .catch(returnError),
  )
  .define("readFeatures", async ({ payload: { projectId, environmentId } }) =>
    // this API may be called for projects in the current organisation
    // TODO later: consider caching or refactoring to reduce calls to readProjects (or use RBAC key)
    checkPermission(
      async () =>
        !projectId || (await readProjects({})).some((project) => String(project.id) === projectId),
    )
      .then(() => readFeatures({ projectId, environmentId }))
      .catch(returnError),
  )
  .define("readEnvironmentFeatureState", async ({ payload: { envApiKey, featureName } }) =>
    // TODO later: consider checking if the environment is in the project (or use RBAC key)
    readEnvironmentFeatureState({ envApiKey, featureName }).catch(returnError),
  );

export const handler = resolver.getDefinitions();
