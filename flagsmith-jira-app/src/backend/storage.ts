import { storage } from "@forge/api";

const API_KEY = "api-key";
const ORGANISATION_ID = "organisation-id";

export type ReadApiKey = () => Promise<string>;
/** Read Flagsmith API Key stored on Jira app */
// return empty value as "" because otherwise invoker returns empty object
export const readApiKey: ReadApiKey = async () => (await storage.getSecret(API_KEY)) ?? "";

export type ReadOrganisationId = () => Promise<string>;
/** Read Flagsmith Organisation ID stored on Jira app */
// return empty value as "" because otherwise invoker returns empty object
export const readOrganisationId: ReadOrganisationId = async () =>
  (await storage.get(ORGANISATION_ID)) ?? "";

export type WriteApiKey = (args: { apiKey: string }) => Promise<void>;
/** Write Flagsmith API Key stored on Jira app */
export const writeApiKey: WriteApiKey = async ({ apiKey }) =>
  await storage.setSecret(API_KEY, apiKey);

export type WriteOrganisationId = (args: { organisationId: string }) => Promise<void>;
/** Write Flagsmith Organisation ID stored on Jira app */
export const writeOrganisationId: WriteOrganisationId = async ({ organisationId }) =>
  await storage.set(ORGANISATION_ID, organisationId);

export type DeleteApiKey = () => Promise<void>;
/** Delete Flagsmith API Key stored on Jira app */
export const deleteApiKey: DeleteApiKey = async () => await storage.deleteSecret(API_KEY);

export type DeleteOrganisationId = () => Promise<void>;
/** Delete Flagsmith Organisation ID stored on Jira app */
export const deleteOrganisationId: DeleteOrganisationId = async () =>
  await storage.delete(ORGANISATION_ID);
