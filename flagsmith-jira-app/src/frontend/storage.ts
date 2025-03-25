import type {
  DeleteApiKey,
  DeleteOrganisationId,
  ReadOrganisationId,
  WriteApiKey,
  WriteOrganisationId,
} from "../backend/storage";
import { customInvoke } from "./invoke";

/** Check existence of Flagsmith API Key stored on Jira app */
export const readHasApiKey = async () => customInvoke<boolean>("readHasApiKey");
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
