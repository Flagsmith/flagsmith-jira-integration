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
  feature_id: number;
  environments: EnvironmentFeatureState[];
};

const head = {
  cells: [
    {
      key: "environment",
      content: "Environment",
    },
    {
      key: "status",
      content: "Status",
    },
    {
      key: "value",
      content: "Value",
    },
    {
      key: "last-updated",
      content: "Last updated",
    },
  ],
};

const makeRows = (projectUrl: string, state: FeatureState) => {
  return state.environments
    .filter((stateEnvironment) => !!stateEnvironment)
    .map((stateEnvironment) => {
      // count variations/overrides
      const variations = stateEnvironment.multivariate_feature_state_values.length;
      const segments = state.environments.filter(
        (each) => String(each.feature) === String(state.feature_id) && each.feature_segment !== null
      ).length;
      const identities = state.environments.filter(
        (each) => String(each.feature) === String(state.feature_id) && each.identity !== null
      ).length;
      return {
        key: `${state.feature_id}`,
        cells: [
          {
            key: "environment",
            content: (
              <Fragment>
                <Text>
                  <Link
                    href={`${projectUrl}/environment/${stateEnvironment.api_key}/features?feature=${state.feature_id}`}
                    openNewTab
                  >
                    {stateEnvironment.name}
                  </Link>
                </Text>
                {variations > 0 && (
                  <Badge appearance="default">{`${variations} variation${
                    variations === 1 ? "" : "s"
                  }`}</Badge>
                )}
                {segments > 0 && (
                  <Badge appearance="default">{`${segments} segment${
                    segments === 1 ? "" : "s"
                  }`}</Badge>
                )}
                {identities > 0 && (
                  <Badge appearance="default">{`${identities} identit${
                    identities === 1 ? "y" : "ies"
                  }`}</Badge>
                )}
              </Fragment>
            ),
          },
          {
            key: "status",
            content: (
              <Lozenge appearance={stateEnvironment.enabled ? "success" : "default"}>
                {stateEnvironment.enabled ? "on" : "off"}
              </Lozenge>
            ),
          },
          {
            key: "value",
            content: stateEnvironment.feature_state_value,
          },
          {
            key: "last-updated",
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
  apiKey: string;
  environments: Environment[];
  feature: Feature;
};

const IssueFeatureTable = ({
  projectUrl,
  apiKey,
  environments,
  feature,
}: IssueFeatureTableProps) => {
  // catch API errors per table rather than cause whole component to fail
  const [error, setError] = useState<Error>();

  /** Read feature state for each environment */
  const readFeatureState = useCallback(
    async (): Promise<FeatureState> => ({
      feature_id: feature.id,
      environments: await Promise.all(
        environments.map(async (environment) => ({
          ...(await readEnvironmentFeatureState({
            apiKey,
            featureName: feature.name,
            envApiKey: String(environment.api_key),
          })),
          name: environment.name,
          api_key: String(environment.api_key),
        }))
      ),
    }),
    [apiKey, environments, feature]
  );
  const [state] = usePromise(
    async () => (error === undefined ? readFeatureState() : undefined),
    [error, readFeatureState],
    setError
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
  projectUrl: string;
  apiKey: string;
  environments: Environment[];
  features: Feature[];
  issueFeatureIds: string[];
};

const IssueFeatureTables = ({
  projectUrl,
  apiKey,
  environments,
  features,
  issueFeatureIds,
}: IssueFeatureTablesProps) => {
  if (features.length === 0 || issueFeatureIds.length === 0) {
    return null;
  }

  return (
    <Fragment>
      {features
        .filter((feature) => issueFeatureIds.includes(String(feature.id)))
        .map((feature) => (
          <Box key={feature.id} xcss={{ marginTop: "space.300" }}>
            <Text>
              <Strong>
                {feature.name}
                {feature.description ? ": " : ""}
              </Strong>
              {feature.description}
            </Text>
            <IssueFeatureTable
              projectUrl={projectUrl}
              apiKey={apiKey}
              environments={environments}
              feature={feature}
            />
          </Box>
        ))}
    </Fragment>
  );
};

export default IssueFeatureTables;
