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

import { usePromise } from "../../common";
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
  projectUrl: string;
  environments: Environment[]; // must be non-empty
  // list of same feature in the context of each environment
  environmentFeatures: Feature[];
};

const IssueFeatureTable = ({
  projectUrl,
  environments,
  environmentFeatures,
}: IssueFeatureTableProps): JSX.Element => {
  // catch API errors per table rather than cause whole component to fail
  const [error, setError] = useState<Error>();

  // get id and name from first feature - assume non-empty
  const featureId = environmentFeatures[0]!.id;
  const featureName = environmentFeatures[0]!.name;

  /** Read feature state for each environment */
  const readFeatureState = useCallback(
    async (): Promise<FeatureState> => ({
      featureId,
      environments: await Promise.all(
        environments.map(async (environment) => ({
          ...(await readEnvironmentFeatureState({
            envApiKey: String(environment.api_key),
            featureName,
          })),
          name: environment.name,
          api_key: String(environment.api_key),
        })),
      ),
      counts: environmentFeatures.map((feature) => ({
        variations: feature.multivariate_options.length,
        segments: feature.num_segment_overrides ?? 0,
        identities: feature.num_identity_overrides ?? 0,
      })),
    }),
    [environments, environmentFeatures],
  );
  const [state] = usePromise(
    async () => (error === undefined ? readFeatureState() : undefined),
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
  baseFeature: Feature | undefined;
  environmentFeatures: Feature[];
};

const buildFeatureTableData = ({
  issueFeatureIds,
  features,
  environmentsFeatures,
}: {
  issueFeatureIds: string[];
  features: Feature[];
  environmentsFeatures: Feature[][];
}): FeatureTableData[] => {
  return issueFeatureIds.map((featureId) => {
    const baseFeature = features.find((f) => String(f.id) === featureId);

    const envFeaturesForThisFeature = environmentsFeatures
      .map((envFeatures) => {
        const matchingFeature = envFeatures.find((f) => String(f.id) === featureId);
        return matchingFeature;
      })
      .filter(Boolean) as Feature[];

    return {
      featureId,
      baseFeature,
      environmentFeatures: envFeaturesForThisFeature,
    };
  });
};

type IssueFeatureTablesProps = {
  projectUrl: string;
  // environments/environmentsFeatures are assumed to be same length/order
  environments: Environment[];
  environmentsFeatures: Feature[][];
  issueFeatureIds: string[];
};

const IssueFeatureTables = ({
  projectUrl,
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
    environmentsFeatures,
  });

  return (
    <Fragment>
      {featureTableData.map(({ featureId, baseFeature, environmentFeatures }) => {
        if (!baseFeature) {
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
              projectUrl={projectUrl}
              environments={environments}
              environmentFeatures={environmentFeatures}
            />
          </Fragment>
        );
      })}
    </Fragment>
  );
};

export default IssueFeatureTables;
