import {
  ReadEnvironments,
  ReadFeatures,
  ReadEnvironmentFeatureState,
  ReadOrganisations,
  ReadProjects,
} from "../backend/flagsmith";
import { customInvoke } from "./invoke";
export {
  Environment,
  EnvironmentFeatureState,
  Feature,
  Organisation,
  Project,
} from "../backend/flagsmith";

/** Read Flagsmith Organisations for stored/given API Key */
export const readOrganisations: ReadOrganisations = async ({ apiKey }) =>
  customInvoke("readOrganisations", { apiKey });

/** Read Flagsmith Projects for stored API Key and stored/given Organisation ID */
export const readProjects: ReadProjects = async ({ organisationId }) =>
  customInvoke("readProjects", { organisationId });

/** Read Flagsmith Environments for stored API Key and given Project ID */
export const readEnvironments: ReadEnvironments = async ({ projectId }) =>
  customInvoke("readEnvironments", { projectId });

/** Read Flagsmith Features for stored API Key, given Project ID and optional Environment ID */
export const readFeatures: ReadFeatures = async ({ projectId, environmentId }) =>
  customInvoke("readFeatures", { projectId, environmentId });

/** Read Flagsmith Feature State for stored API Key and given Environment API Key and Feature Name */
export const readEnvironmentFeatureState: ReadEnvironmentFeatureState = async ({
  envApiKey,
  featureName,
}) => customInvoke("readEnvironmentFeatureState", { envApiKey, featureName });
