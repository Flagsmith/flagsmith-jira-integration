import { storage } from "@forge/api";

const API_KEY = "api-key";
const ORGANISATION_ID = "organisation-id";

export const readApiKey = async () => (await storage.getSecret(API_KEY)) as string;
export const readOrganisationId = async () => (await storage.get(ORGANISATION_ID)) as string;

export const writeApiKey = async (apiKey: string) => await storage.setSecret(API_KEY, apiKey);
export const writeOrganisationId = async (organisationId: string) =>
  await storage.set(ORGANISATION_ID, organisationId);

export const deleteApiKey = async () => await storage.deleteSecret(API_KEY);
export const deleteOrganisationId = async () => await storage.delete(ORGANISATION_ID);
