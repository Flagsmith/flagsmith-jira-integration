import type {
  DeleteApiKey,
  DeleteOrganisationId,
  ReadApiKey,
  ReadOrganisationId,
  WriteApiKey,
  WriteOrganisationId,
} from "../backend/storage";
import { customInvoke } from "./invoke";

/** Read Flagsmith API Key stored on Jira app */
export const readApiKey: ReadApiKey = async () => customInvoke("readApiKey");
/** Read Flagsmith Organisation ID stored on Jira app */
export const readOrganisationId: ReadOrganisationId = async () =>
  customInvoke("readOrganisationId");

/** Write Flagsmith API Key stored on Jira app */
export const writeApiKey: WriteApiKey = async ({ apiKey }) =>
  customInvoke("writeApiKey", { apiKey });
/** Write Flagsmith Organisation ID stored on Jira app */
export const writeOrganisationId: WriteOrganisationId = async ({ organisationId }) =>
  customInvoke("writeOrganisationId", { organisationId });

/** Delete Flagsmith API Key stored on Jira app */
export const deleteApiKey: DeleteApiKey = async () => customInvoke("deleteApiKey");
/** Delete Flagsmith Organisation ID stored on Jira app */
export const deleteOrganisationId: DeleteOrganisationId = async () =>
  customInvoke("deleteOrganisationId");
