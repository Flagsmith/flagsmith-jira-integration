import { invoke } from "@forge/bridge";
import { InvokePayload } from "@forge/bridge/out/types";

import { ErrorPayload } from "../common";

/** re-throw Error object returned by custom resolver */
export const customInvoke = async <T>(
  functionKey: string,
  payload: InvokePayload | undefined = undefined,
) => {
  const response = await invoke<T | ErrorPayload>(functionKey, payload);
  // rethrow Error object if present
  if (Object.hasOwnProperty.call(response, "error")) {
    throw (response as ErrorPayload).error;
  }
  // otherwise return as normal
  return response as T;
};
