import Resolver from "@forge/resolver";

import { canEditIssue } from "./backend/auth";
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
import { ErrorPayload } from "./common";

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

resolver
  .define("readHasApiKey", async () =>
    readApiKey()
      .then((apiKey) => !!apiKey)
      .catch(returnError),
  )
  .define("readOrganisationId", async () => readOrganisationId().catch(returnError));

resolver
  .define("writeApiKey", async ({ payload: { apiKey } }) =>
    writeApiKey({ apiKey }).catch(returnError),
  )
  .define("writeOrganisationId", async ({ payload: { organisationId } }) =>
    writeOrganisationId({ organisationId }).catch(returnError),
  );

resolver
  .define("deleteApiKey", async () => deleteApiKey().catch(returnError))
  .define("deleteOrganisationId", async () => deleteOrganisationId().catch(returnError));

resolver
  .define("readOrganisations", async ({ payload: { apiKey } }) =>
    readOrganisations({ apiKey }).catch(returnError),
  )
  .define("readProjects", async ({ payload: { organisationId } }) =>
    readProjects({ organisationId }).catch(returnError),
  )
  .define("readEnvironments", async ({ payload: { projectId } }) =>
    readEnvironments({ projectId }).catch(returnError),
  )
  .define("readFeatures", async ({ payload: { projectId } }) =>
    readFeatures({ projectId }).catch(returnError),
  )
  .define("readEnvironmentFeatureState", async ({ payload: { envApiKey, featureName } }) =>
    readEnvironmentFeatureState({ envApiKey, featureName }).catch(returnError),
  );

export const handler = resolver.getDefinitions();
