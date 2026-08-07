import { RequestInit } from "@forge/api";
import { useEffect, useState } from "react";

export type ApiArgs = Partial<{
  method: RequestInit["method"];
  headers: RequestInit["headers"];
  body: RequestInit["body"];
  codes: number[];
  jsonResponse: boolean;
}>;

export class ApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "ApiError";
    this.code = code || 502;
  }
}

export type ErrorPayload = { error: Error };

/** Frontend-visible configuration passed back across the invoke bridge */
export type Config = {
  flagsmithApp: string;
};

export type ReadConfig = () => Promise<Config>;

/** Use a promise safely i.e. ignore result if subsequently unmounted */
export const usePromise = <T>(
  promise: () => Promise<T>,
  deps: unknown[],
  setError?: (error: Error) => void,
): [T | undefined, (value: T | undefined) => void] => {
  const [result, setResult] = useState<T | undefined>();
  useEffect(() => {
    let isMounted = true;
    promise()
      .then((value) => {
        if (isMounted) {
          setResult(value);
        }
      })
      .catch((error) => {
        if (setError) {
          setError(error);
        } else {
          throw error;
        }
      });
    return () => {
      isMounted = false;
    };
  }, deps);
  return [result, setResult];
};
