import { DEFAULT_FLAGSMITH_APP } from "../common";

/** Configuration exposed to the frontend (which cannot read process.env directly) */
export type Config = {
  flagsmithApp: string;
};

export type ReadConfig = () => Promise<Config>;

/** Read frontend-visible configuration from runtime environment variables */
export const readConfig: ReadConfig = async () => ({
  flagsmithApp: process.env.FLAGSMITH_APP ?? DEFAULT_FLAGSMITH_APP,
});
