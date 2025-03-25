import { Spinner, useProductContext } from "@forge/react";
import { Fragment, useEffect, useState } from "react";

import { ApiError, FLAGSMITH_APP, usePromise } from "../../common";
import { canEditIssue } from "../auth";
import { readEnvironments, readFeatures } from "../flagsmith";
import { readFeatureIds, readProjectId, writeFeatureIds } from "../jira";

import { WrappableComponentProps } from "./ErrorWrapper";
import IssueFeaturesForm from "./IssueFeaturesForm";
import IssueFeatureTables from "./IssueFeatureTables";

const IssueFeaturesPanel = ({ setError }: WrappableComponentProps): JSX.Element => {
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
    setError,
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
    setError,
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
    setError,
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
        if (projectId !== undefined) {
          return await readEnvironments({ projectId });
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
    [projectId],
    setError,
  );

  // get features in the context of each environment from Flagsmith API
  const [environmentsFeatures] = usePromise(
    async () => {
      try {
        if (projectId !== undefined && environments !== undefined) {
          return await Promise.all(
            environments.map((environment) =>
              readFeatures({ projectId, environmentId: String(environment.id) }),
            ),
          );
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
    [projectId, environments],
    setError,
  );

  /** Write Feature IDs to Jira issue and update form state */
  const saveIssueFeatureIds = async (featureIds: string[]) => {
    try {
      if (extension) {
        await writeFeatureIds(extension, featureIds);
        setFeatureIds(featureIds);
      }
    } catch (error) {
      setError(error as Error);
    }
  };

  const projectUrl = `${FLAGSMITH_APP}/project/${projectId}`;

  const ready =
    extension !== undefined &&
    projectId !== undefined &&
    featureIds !== undefined &&
    environments !== undefined &&
    environmentsFeatures !== undefined;

  return ready ? (
    <Fragment>
      {canEdit && (
        <IssueFeaturesForm
          // use features from the first environment for form
          // (id/name are the same across environments)
          features={environmentsFeatures[0] ?? []}
          issueFeatureIds={featureIds}
          saveIssueFeatureIds={saveIssueFeatureIds}
          canEdit={canEdit}
          editing={editing}
          setEditing={setEditing}
        />
      )}
      <IssueFeatureTables
        projectUrl={projectUrl}
        // environments/environmentsFeatures are assumed to be same length/order
        environments={environments}
        environmentsFeatures={environmentsFeatures}
        issueFeatureIds={featureIds}
      />
    </Fragment>
  ) : (
    <Spinner label="Loading feature flags" />
  );
};

export default IssueFeaturesPanel;
