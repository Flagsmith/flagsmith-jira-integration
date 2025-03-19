import Resolver from "@forge/resolver";

import { canEditIssue } from "../backend/auth";
import {
  readEnvironmentFeatureState,
  readEnvironments,
  readFeatures,
  readOrganisations,
  readProjects,
} from "../backend/flagsmith";
import {
  deleteApiKey,
  deleteOrganisationId,
  readApiKey,
  readOrganisationId,
  writeApiKey,
  writeOrganisationId,
} from "../backend/storage";
import { ErrorPayload } from "../common";

/** Return errors and their properties to frontend without Forge mangling them */
const returnError = (error: Error): ErrorPayload => ({ error });

const resolver = new Resolver();

resolver.define("canEditIssue", async ({ payload }) => canEditIssue(payload).catch(returnError));

resolver
  .define("readApiKey", async () => readApiKey().catch(returnError))
  .define("readOrganisationId", async () => readOrganisationId().catch(returnError));

resolver
  .define("writeApiKey", async ({ payload: { apiKey } }) =>
    writeApiKey({ apiKey }).catch(returnError)
  )
  .define("writeOrganisationId", async ({ payload: { organisationId } }) =>
    writeOrganisationId({ organisationId }).catch(returnError)
  );

resolver
  .define("deleteApiKey", async () => deleteApiKey().catch(returnError))
  .define("deleteOrganisationId", async () => deleteOrganisationId().catch(returnError));

resolver
  .define("readOrganisations", async ({ payload: { apiKey } }) =>
    readOrganisations({ apiKey }).catch(returnError)
  )
  .define("readProjects", async ({ payload: { apiKey, organisationId } }) =>
    readProjects({ apiKey, organisationId }).catch(returnError)
  )
  .define("readEnvironments", async ({ payload: { apiKey, projectId } }) =>
    readEnvironments({ apiKey, projectId }).catch(returnError)
  )
  .define("readFeatures", async ({ payload: { apiKey, projectId } }) =>
    readFeatures({ apiKey, projectId }).catch(returnError)
  )
  .define("readEnvironmentFeatureState", async ({ payload: { apiKey, envApiKey, featureName } }) =>
    readEnvironmentFeatureState({ apiKey, envApiKey, featureName }).catch(returnError)
  );

export const handler = resolver.getDefinitions();
