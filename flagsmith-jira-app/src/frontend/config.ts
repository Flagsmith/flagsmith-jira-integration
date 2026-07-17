import { ReadConfig } from "../backend/config";
import { customInvoke } from "./invoke";
export { Config } from "../backend/config";

/** Read frontend-visible configuration from the backend resolver */
export const readConfig: ReadConfig = async () => customInvoke("readConfig");
