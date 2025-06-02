import { Spinner, useProductContext } from "@forge/react";
import { Fragment, useEffect, useState } from "react";

import { ApiError, usePromise } from "../../common";
import { canEditIssue } from "../auth";
import { readEnvironments, readFeatures } from "../flagsmith";
import { readFeatureIds, readProjectIds, writeFeatureIds } from "../jira";

import { WrappableComponentProps } from "./ErrorWrapper";
import IssueFeaturesForm from "./IssueFeaturesForm";
import IssueFeatureTables from "./IssueFeatureTables";

const IssueFeaturesPanel = ({ setError }: WrappableComponentProps): JSX.Element => {
  // get project context extension
  const context = useProductContext();
  const extension = context?.extension;

  // get Flagsmith project ID from Jira project
  const [projectIds] = usePromise(
    async () => {
      if (extension) {
        return await readProjectIds(extension);
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
        if (projectIds && projectIds.length > 0) {
          const all = await Promise.all(
            projectIds.map((projectId) => readEnvironments({ projectId })),
          );
          return all.flat(); // Combine all environments into one flat array
        }
        return [];
      } catch (error) {
        if (
          !Object.prototype.hasOwnProperty.call(error, "code") ||
          ![404].includes((error as ApiError).code)
        ) {
          setError(error as Error);
        }
        return [];
      }
    },
    [projectIds],
    setError,
  );

  // get features in the context of each environment from Flagsmith API
  const [environmentsFeatures] = usePromise(
    async () => {
      try {
        if (projectIds && projectIds.length > 0 && environments !== undefined) {
          return await Promise.all(
            environments.map((environment) =>
              readFeatures({ projectIds, environmentId: String(environment.id) }),
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
    [projectIds, environments],
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

  const ready =
    extension !== undefined &&
    projectIds !== undefined &&
    projectIds.length > 0 &&
    featureIds !== undefined &&
    environments !== undefined &&
    environmentsFeatures !== undefined &&
    environmentsFeatures.length > 0 &&
    environmentsFeatures[0] !== undefined &&
    environmentsFeatures[0].length > 0;

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
