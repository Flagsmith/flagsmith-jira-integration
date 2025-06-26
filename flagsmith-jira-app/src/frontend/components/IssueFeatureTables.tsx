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
  const featureProjectId = environmentFeatures[0]!.project;
  const projectUrl = `${FLAGSMITH_APP}/project/${featureProjectId}`;

  /** Read feature state for each environment */
  const readFeatureState = useCallback(async (): Promise<FeatureState> => {
    const matchingEnvs = environments.filter(
      (env) => String(env.project) === String(featureProjectId),
    );

    const environmentFeatureStates = await Promise.all(
      matchingEnvs.map(async (environment) => {
        try {
          const state = await readEnvironmentFeatureState({
            envApiKey: String(environment.api_key),
            featureName,
          });

          return {
            ...state,
            name: environment.name,
            api_key: String(environment.api_key),
          };
        } catch (err) {
          console.warn(
            `Failed to read feature state for environment "${environment.name}" (${environment.id})`,
            {
              featureName,
              apiKey: environment.api_key,
              error: err instanceof Error ? err.message : String(err),
            },
          );
          return null;
        }
      }),
    );

    const validStates = environmentFeatureStates.filter(
      (state): state is EnvironmentFeatureState => !!state,
    );

    const relevantFeatures = environmentFeatures.filter(
      (f) => String(f.project) === String(featureProjectId),
    );

    return {
      featureId,
      environments: validStates,
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
        return await readFeatureState();
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

type FeatureTableData = {
  featureId: string;
  baseFeature: Feature;
  envFeaturesForThisFeature: Feature[];
  matchingEnvironments: Environment[];
};

const buildFeatureTableData = ({
  issueFeatureIds,
  features,
  environments,
  environmentsFeatures,
}: {
  issueFeatureIds: string[];
  features: Feature[];
  environments: Environment[];
  environmentsFeatures: Feature[][];
}): FeatureTableData[] => {
  return issueFeatureIds
    .map((featureId) => {
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

      return {
        featureId,
        baseFeature,
        envFeaturesForThisFeature,
        matchingEnvironments,
      };
    })
    .filter((data): data is FeatureTableData => !!data);
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
  const featureTableData = buildFeatureTableData({
    issueFeatureIds,
    features,
    environments,
    environmentsFeatures,
  });

  return (
    <Fragment>
      {featureTableData.map(
        ({ featureId, baseFeature, matchingEnvironments, envFeaturesForThisFeature }) => (
          <Fragment key={featureId}>
            <Box xcss={{ marginTop: "space.300", marginBottom: "space.100" }}>
              <Text>
                <Strong>
                  {baseFeature.name} ({baseFeature.project_name})
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
        ),
      )}
    </Fragment>
  );
};

export default IssueFeatureTables;
