import { Spinner, useProductContext } from "@forge/react";
import React, { Fragment, useEffect, useState } from "react";

import { ApiError, FLAGSMITH_APP, usePromise } from "../../common";
import { canEditIssue } from "../auth";
import { readEnvironments, readFeatures } from "../flagsmith";
import { readFeatureIds, readProjectId, writeFeatureIds } from "../jira";
import { readApiKey } from "../storage";
import { WrappableComponentProps } from "./ErrorWrapper";
import IssueFeaturesForm from "./IssueFeaturesForm";
import IssueFeatureTables from "./IssueFeatureTables";

const IssueFeaturesPanel: React.FC<WrappableComponentProps> = ({ setError }) => {
  // get configuration from storage
  const [apiKey] = usePromise(readApiKey, [], setError);

  // get project context extension
  const context = useProductContext();
  const extension = context?.extension;

  // get Flagsmith project ID from Jira project
  const [projectId] = usePromise(
    async () => {
      if (extension) {
        return await readProjectId(extension);
      }
      return undefined;
    },
    [extension],
    setError
  );

  // get Flagsmith features IDs from Jira issue
  const [featureIds, setFeatureIds] = usePromise(
    async () => {
      if (extension) {
        return await readFeatureIds(extension);
      }
      return undefined;
    },
    [extension],
    setError
  );

  // get Jira permissions
  const [canEdit] = usePromise(
    async () => {
      if (extension) {
        return await canEditIssue(extension);
      }
      return false;
    },
    [extension],
    setError
  );

  // set initial editing state
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (extension?.isNewToIssue && canEdit) {
      setEditing(true);
    }
  }, [extension?.isNewToIssue, canEdit]);

  // get environments from Flagsmith API
  const [environments] = usePromise(
    async () => {
      try {
        if (apiKey && projectId) {
          return await readEnvironments({ apiKey, projectId });
        } else {
          return undefined;
        }
      } catch (error) {
        // ignore 404 (no environments) as that is handled by the form
        if (
          !Object.prototype.hasOwnProperty.call(error, "code") ||
          ![404].includes((error as ApiError).code)
        ) {
          setError(error as Error);
        }
        return [];
      }
    },
    [apiKey, projectId],
    setError
  );

  // get features from Flagsmith API
  const [features] = usePromise(
    async () => {
      try {
        if (apiKey && projectId) {
          return await readFeatures({ apiKey, projectId });
        } else {
          return undefined;
        }
      } catch (error) {
        // ignore 404 (no features) as that is handled by the form
        if (
          !Object.prototype.hasOwnProperty.call(error, "code") ||
          ![404].includes((error as ApiError).code)
        ) {
          setError(error as Error);
        }
        return [];
      }
    },
    [apiKey, projectId],
    setError
  );

  /** Optimistic update form state and write Feature IDs to Jira issue */
  const saveIssueFeatureIds = async (featureIds: string[]) => {
    if (extension) {
      setFeatureIds(featureIds);
      await writeFeatureIds(extension, featureIds);
    }
  };

  const projectUrl = `${FLAGSMITH_APP}/project/${projectId}`;

  const ready =
    apiKey !== undefined &&
    extension !== undefined &&
    projectId !== undefined &&
    featureIds !== undefined &&
    features !== undefined &&
    environments !== undefined;

  return ready ? (
    <Fragment>
      {canEdit && (
        <IssueFeaturesForm
          features={features}
          issueFeatureIds={featureIds}
          saveIssueFeatureIds={saveIssueFeatureIds}
          canEdit={canEdit}
          editing={editing}
          setEditing={setEditing}
        />
      )}
      <IssueFeatureTables
        projectUrl={projectUrl}
        apiKey={apiKey}
        environments={environments}
        features={features}
        issueFeatureIds={featureIds}
      />
    </Fragment>
  ) : (
    <Spinner label="Loading feature flags" />
  );
};

export default IssueFeaturesPanel;
