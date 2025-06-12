import {
  Badge,
  Box,
  Button,
  DynamicTable,
  ErrorMessage,
  Inline,
  Link,
  Lozenge,
  Spinner,
  Strong,
  Text,
} from "@forge/react";
import { Fragment, useCallback, useState } from "react";

import { FLAGSMITH_APP, usePromise } from "../../common";
import {
  Environment,
  EnvironmentFeatureState,
  Feature,
  readEnvironmentFeatureState,
} from "../flagsmith";

type FeatureState = {
  featureId: number;
  environments: EnvironmentFeatureState[];
  counts: {
    variations: number;
    segments: number;
    identities: number;
  }[];
};

const head = {
  cells: [
    {
      key: "environment",
      content: "Environment",
      isSortable: true,
      width: 30,
    },
    {
      key: "status",
      content: "Status",
      isSortable: true,
      width: 20,
    },
    {
      key: "value",
      content: "Value",
      isSortable: true,
      width: 30,
    },
    {
      key: "last-updated",
      content: "Last updated",
      isSortable: true,
      width: 20,
    },
  ],
};

const makeRows = (projectUrl: string, state: FeatureState) => {
  return state.environments
    .filter((stateEnvironment) => !!stateEnvironment)
    .map((stateEnvironment, index) => {
      const variations = state.counts[index]?.variations;
      const segments = state.counts[index]?.segments;
      const identities = state.counts[index]?.identities;
      return {
        key: `${state.featureId}`,
        cells: [
          {
            key: `environment--${stateEnvironment.name.toLowerCase()}`,
            content: (
              <Fragment>
                <Text>
                  <Link
                    href={`${projectUrl}/environment/${stateEnvironment.api_key}/features?feature=${state.featureId}`}
                    openNewTab
                  >
                    {stateEnvironment.name}
                  </Link>
                </Text>
                {!!variations && (
                  <Badge appearance="default">{`${variations} variation${
                    variations === 1 ? "" : "s"
                  }`}</Badge>
                )}
                {!!segments && (
                  <Badge appearance="default">{`${segments} segment${
                    segments === 1 ? "" : "s"
                  }`}</Badge>
                )}
                {!!identities && (
                  <Badge appearance="default">{`${identities} identit${
                    identities === 1 ? "y" : "ies"
                  }`}</Badge>
                )}
              </Fragment>
            ),
          },
          {
            key: `status--${stateEnvironment.enabled ? 1 : 0}`,
            content: (
              <Lozenge appearance={stateEnvironment.enabled ? "success" : "default"}>
                {stateEnvironment.enabled ? "on" : "off"}
              </Lozenge>
            ),
          },
          {
            key: `value--${stateEnvironment.feature_state_value}`,
            content: stateEnvironment.feature_state_value,
          },
          {
            key: `last-updated--${String(new Date(stateEnvironment.updated_at).getTime())}`,
            content: (
              <Lozenge>
                {new Date(stateEnvironment.updated_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Lozenge>
            ),
          },
        ],
      };
    });
};

type IssueFeatureTableProps = {
  environments: Environment[]; // must be non-empty
  // list of same feature in the context of each environment
  environmentFeatures: Feature[];
};

const IssueFeatureTable = ({
  environments,
  environmentFeatures,
}: IssueFeatureTableProps): JSX.Element => {
  // catch API errors per table rather than cause whole component to fail
  const [error, setError] = useState<Error>();

  // get id and name from first feature - assume non-empty
  const featureId = environmentFeatures[0]!.id;
  const featureName = environmentFeatures[0]!.name;

  const projectUrl = `${FLAGSMITH_APP}/project/${environmentFeatures[0]?.project}`;

  /** Read feature state for each environment */
  const readFeatureState = useCallback(async (): Promise<FeatureState> => {
    const featureProjectId = environmentFeatures[0]?.project;

    console.log("[DEBUG] readFeatureState() invoked");
    console.log("[DEBUG] featureId:", featureId);
    console.log("[DEBUG] featureName:", featureName);
    console.log("[DEBUG] featureProjectId:", featureProjectId);
    console.log(
      `[DEBUG] All environments available:`,
      environments.map((e) => ({ name: e.name, project: e.project })),
    );

    const matchingEnvs = environments.filter(
      (env) => String(env.project) === String(featureProjectId),
    );
    console.log(
      `[DEBUG] Environments matched to feature project ${featureProjectId}:`,
      matchingEnvs.map((e) => e.name),
    );

    const environmentFeatureStates = await Promise.all(
      matchingEnvs.map(async (environment) => {
        console.log("[DEBUG][1] Fetching state for:", {
          featureName,
          envApiKey: environment.api_key,
          envName: environment.name,
          projectId: environment.project,
        });

        try {
          const state = await readEnvironmentFeatureState({
            envApiKey: String(environment.api_key),
            featureName,
          });

          console.log("[DEBUG][2] Feature state response:", {
            envName: environment.name,
            feature_state_value: state.feature_state_value,
          });

          return {
            ...state,
            name: environment.name,
            api_key: String(environment.api_key),
          };
        } catch (err) {
          console.error("[ERROR][3] Failed to fetch feature state for env:", {
            featureName,
            envApiKey: environment.api_key,
            error: err,
          });
          return null;
        }
      }),
    );

    const validStates = environmentFeatureStates.filter(Boolean);
    console.log("[DEBUG][4] Valid feature states returned:", validStates);

    const relevantFeatures = environmentFeatures.filter(
      (f) => String(f.project) === String(featureProjectId),
    );
    console.log("[DEBUG][5] Relevant features for count mapping:", relevantFeatures);

    return {
      featureId,
      environments: validStates as EnvironmentFeatureState[],
      counts: relevantFeatures.map((feature) => ({
        variations: feature.multivariate_options.length,
        segments: feature.num_segment_overrides ?? 0,
        identities: feature.num_identity_overrides ?? 0,
      })),
    };
  }, [environments, environmentFeatures]);

  const [state] = usePromise(
    async () => {
      if (error === undefined) {
        try {
          return await readFeatureState();
        } catch (err) {
          console.error("[ERROR] Failed to read feature state:", err);
          throw err;
        }
      }
      return undefined;
    },
    [error, readFeatureState],
    setError,
  );

  if (error !== undefined) {
    return (
      <Box xcss={{ marginTop: "space.100" }}>
        <Inline space="space.100">
          <ErrorMessage>Error loading feature flag state</ErrorMessage>
          <Button spacing="compact" onClick={() => setError(undefined)}>
            Retry
          </Button>
        </Inline>
      </Box>
    );
  }

  if (state === undefined) {
    return <Spinner label="Loading feature flag state" />;
  }

  return <DynamicTable head={head} rows={makeRows(projectUrl, state)} />;
};

type IssueFeatureTablesProps = {
  // environments/environmentsFeatures are assumed to be same length/order
  environments: Environment[];
  environmentsFeatures: Feature[][];
  issueFeatureIds: string[];
};

const IssueFeatureTables = ({
  environments,
  environmentsFeatures,
  issueFeatureIds,
}: IssueFeatureTablesProps): JSX.Element => {
  if (
    environmentsFeatures.length === 0 ||
    environmentsFeatures[0] === undefined ||
    issueFeatureIds.length === 0
  ) {
    return <Fragment />;
  }

  // iterate features from the first environment to get list of tables
  // (id/name/description are the same across environments)
  const features = environmentsFeatures[0];

  return (
    <Fragment>
      {issueFeatureIds.map((featureId) => {
        const baseFeature = features.find((f) => String(f.id) === featureId);
        if (!baseFeature) {
          return null;
        }

        const envFeaturesForThisFeature: Feature[] = [];
        const matchingEnvironments: Environment[] = [];

        environmentsFeatures.forEach((envFeatures, index) => {
          const matchingFeature = envFeatures.find((f) => String(f.id) === featureId);
          const environment = environments[index];
          if (matchingFeature && environment !== undefined) {
            envFeaturesForThisFeature.push(matchingFeature);
            matchingEnvironments.push(environment);
          }
        });

        if (envFeaturesForThisFeature.length === 0 || matchingEnvironments.length === 0) {
          return null;
        }

        return (
          <Fragment key={featureId}>
            <Box xcss={{ marginTop: "space.300", marginBottom: "space.100" }}>
              <Text>
                <Strong>
                  {baseFeature.name}
                  {baseFeature.description ? ": " : ""}
                </Strong>
                {baseFeature.description}
              </Text>
            </Box>
            <IssueFeatureTable
              environments={matchingEnvironments}
              environmentFeatures={envFeaturesForThisFeature}
            />
          </Fragment>
        );
      })}
    </Fragment>
  );
};

export default IssueFeatureTables;
