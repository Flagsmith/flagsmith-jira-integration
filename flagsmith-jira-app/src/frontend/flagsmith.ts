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

/** Read Flagsmith Organisations for given API Key */
export const readOrganisations: ReadOrganisations = async ({ apiKey }) =>
  customInvoke("readOrganisations", { apiKey });

/** Read Flagsmith Projects for given API Key and Organisation ID */
export const readProjects: ReadProjects = async ({ apiKey, organisationId }) =>
  customInvoke("readProjects", { apiKey, organisationId });

/** Read Flagsmith Environments for given API Key and Project ID */
export const readEnvironments: ReadEnvironments = async ({ apiKey, projectId }) =>
  customInvoke("readEnvironments", { apiKey, projectId });

/** Read Flagsmith Features for given API Key and Project ID */
export const readFeatures: ReadFeatures = async ({ apiKey, projectId }) =>
  customInvoke("readFeatures", { apiKey, projectId });

/** Read Flagsmith Feature State for given API Key, Environment API Key and Feature Name */
export const readEnvironmentFeatureState: ReadEnvironmentFeatureState = async ({
  apiKey,
  envApiKey,
  featureName,
}) => customInvoke("readEnvironmentFeatureState", { apiKey, envApiKey, featureName });
