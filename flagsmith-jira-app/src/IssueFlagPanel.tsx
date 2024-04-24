import ForgeUI, {
  Badge,
  Button,
  ButtonSet,
  Cell,
  DateLozenge,
  Form,
  Fragment,
  Head,
  IssuePanel,
  IssuePanelAction,
  JiraContext,
  Link,
  Option,
  Row,
  Select,
  StatusLozenge,
  Strong,
  Table,
  Text,
  useEffect,
  useState,
} from "@forge/ui";

import { ErrorWrapper, useJiraContext } from "./common";
import {
  EnvironmentModel,
  FLAGSMITH_APP,
  FeatureModel,
  EnvironmentFeatureState,
  FlagModel,
  fetchEnvironments,
  fetchFeatures,
  fetchFeatureState,
} from "./flagsmith";
import { canEditIssue, readFeatureIds, readProjectId, writeFeatureIds } from "./jira";
import { readApiKey, readOrganisationId } from "./storage";

// dummy call to stop the linter removing JSX-enabling import
ForgeUI;

type IssueFlagFormProps = {
  flagsmithFeatures: FeatureModel[];
  jiraFeatureIds: string[];
  onAdd: (featureId: string) => Promise<void>;
};

const IssueFlagForm = ({ flagsmithFeatures, jiraFeatureIds, onAdd }: IssueFlagFormProps) => {
  const addableFeatures = flagsmithFeatures.filter(
    (feature) => !jiraFeatureIds.includes(String(feature.id)),
  );

  return (
    <Fragment>
      {addableFeatures.length > 0 && (
        <Form onSubmit={(data) => onAdd(data.featureId)} submitButtonText="Link to issue">
          <Select
            name="featureId"
            label="Feature"
            description="Choose a Flagsmith feature"
            isRequired
            aria-required={true}
          >
            {addableFeatures.map((feature) => (
              <Option key={String(feature.id)} label={feature.name} value={String(feature.id)} />
            ))}
          </Select>
        </Form>
      )}
    </Fragment>
  );
};

type IssueFlagTableProps = {
  projectUrl: string;
  apiKey: string;
  environments: EnvironmentModel[];
  flagsmithFeatures: FeatureModel[];
  jiraFeatureIds: string[];
  onRemove: (featureId: string) => Promise<void>;
  canEdit: boolean;
};

type FeatureState = FlagModel & {
  [key: string]: string | number | EnvironmentFeatureState[];
};

const IssueFlagTable = ({
  projectUrl,
  apiKey,
  environments,
  flagsmithFeatures,
  jiraFeatureIds,
  onRemove,
  canEdit,
}: IssueFlagTableProps) => {
  const [environmentFlags, setEnvironmentFlags] = useState<FeatureState[]>([]);

  useEffect(async () => {
    // Filtered features by comparing their IDs with the feature IDs stored in Jira.
    const flagsmithfeaturesFiltered = flagsmithFeatures.filter((f) =>
      jiraFeatureIds.includes(String(f.id)),
    );
    try {
      if (environments.length > 0 && flagsmithfeaturesFiltered.length > 0) {
        const featureState: { [key: string]: FeatureState } = {};
        // Iterate over each filtered feature.
        for (const feature of flagsmithfeaturesFiltered) {
          // Initialize an object to store the state of the feature.
          featureState[String(feature.name)] = {
            name: feature.name,
            feature_id: feature.id,
            description: feature.description,
            environments: [],
          };
          for (const environment of environments) {
            // Obtain the feature states of the filtered features.
            const ffData = await fetchFeatureState({
              apiKey,
              featureName: feature.name,
              envAPIKey: String(environment.api_key),
            });
            ffData.name = environment.name;
            ffData.api_key = String(environment.api_key);
            // Add the feature state data to the feature state object.
            featureState[String(feature.name)]?.environments.push(ffData);
          }
        }
        const ffArray = Object.keys(featureState).map(
          (featureName) => featureState[featureName],
        ) as FeatureState[];
        setEnvironmentFlags(ffArray as FeatureState[]);
      } else {
        setEnvironmentFlags([]);
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
  }, [apiKey, jiraFeatureIds, environments, flagsmithFeatures]);

  if (jiraFeatureIds.length === 0) {
    return <Text>No feature flags are linked to this issue.</Text>;
  }

  let first = true;
  return (
    <Fragment>
      {environmentFlags.map((environmentFlag: FeatureState) => {
        // add vertical space to separate the previous feature's Remove button from this feature
        const spacer = first ? null : <Text>&nbsp;</Text>;
        first = false;
        return (
          !!environmentFlag && (
            <Fragment key={environmentFlag.feature_id}>
              {canEdit && spacer}
              <Text>
                <Strong>
                  {environmentFlag.name}
                  {environmentFlag.description ? ": " : ""}
                </Strong>
                {environmentFlag.description}
              </Text>
              <Table>
                <Head>
                  <Cell>
                    <Text>Environment</Text>
                  </Cell>
                  <Cell>
                    <Text>Status</Text>
                  </Cell>
                  <Cell>
                    <Text>Value</Text>
                  </Cell>
                  <Cell>
                    <Text>Last updated</Text>
                  </Cell>
                </Head>
                {environmentFlag?.environments.map((flag: EnvironmentFeatureState) => {
                  if (!flag) return null;
                  // count variations/overrides
                  const variations = flag.multivariate_feature_state_values.length;
                  const segments = environmentFlag.environments.filter(
                    (each: EnvironmentFeatureState) =>
                      String(each.feature) === String(environmentFlag.feature_id) &&
                      each.feature_segment !== null,
                  ).length;
                  const identities = environmentFlag.environments.filter(
                    (each: EnvironmentFeatureState) =>
                      String(each.feature) === String(environmentFlag.feature_id) &&
                      each.identity !== null,
                  ).length;
                  return (
                    <Row key={String(`${environmentFlag.feature_id}`)}>
                      <Cell>
                        <Text>
                          <Link
                            href={`${projectUrl}/environment/${flag.api_key}/features?feature=${environmentFlag.feature_id}`}
                            appearance="link"
                            openNewTab
                          >
                            {flag.name}
                          </Link>
                        </Text>
                        {variations > 0 && (
                          <Text>
                            <Badge
                              appearance="default"
                              text={`${variations} variation${variations === 1 ? "" : "s"}`}
                            />
                          </Text>
                        )}
                        {segments > 0 && (
                          <Text>
                            <Badge
                              appearance="default"
                              text={`${segments} segment${segments === 1 ? "" : "s"}`}
                            />
                          </Text>
                        )}
                        {identities > 0 && (
                          <Text>
                            <Badge
                              appearance="default"
                              text={`${identities} identit${identities === 1 ? "y" : "ies"}`}
                            />
                          </Text>
                        )}
                      </Cell>
                      <Cell>
                        <Text>
                          <StatusLozenge
                            appearance={flag.enabled ? "success" : "default"}
                            text={flag.enabled ? "on" : "off"}
                          />
                        </Text>
                      </Cell>
                      <Cell>
                        <Text>{flag.feature_state_value}</Text>
                      </Cell>
                      <Cell>
                        <Text>
                          <DateLozenge value={new Date(flag.updated_at).getTime()} />
                        </Text>
                      </Cell>
                    </Row>
                  );
                })}
              </Table>
              {canEdit && (
                <ButtonSet>
                  <Button
                    text="Unlink from issue"
                    onClick={() => onRemove(`${environmentFlag.feature_id}`)}
                  />
                </ButtonSet>
              )}
            </Fragment>
          )
        );
      })}
    </Fragment>
  );
};

type IssueFlagPanelProps = {
  setError: (error: Error) => void;
  jiraContext: JiraContext;
  apiKey: string;
  organisationId: string;
  projectId: string | undefined;
  jiraFeatureIds: string[] | undefined;
  canEdit: boolean;
};

const IssueFlagPanel = ({
  setError,
  apiKey,
  jiraContext,
  projectId,
  canEdit,
  ...props
}: IssueFlagPanelProps) => {
  // set initial state
  const [jiraFeatureIds, setJiraFeatureIds] = useState(props.jiraFeatureIds ?? []);
  const [environments, setEnvironments] = useState([] as EnvironmentModel[]);
  const [features, setFeatures] = useState([] as FeatureModel[]);
  // load environments and features
  useEffect(async () => {
    try {
      // obtain environments from API
      const environments = await fetchEnvironments({ apiKey, projectId });
      // update form state
      setEnvironments(environments);
      // obtain features from API, ignoring archived features
      const features = (await fetchFeatures({ apiKey, projectId })).filter(
        (each) => !each.archived_at,
      );
      // update form state
      setFeatures(features);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setError(error);
    }
  }, [apiKey, String(projectId)]);

  const onChange = async (jiraFeatureIds: string[]) => {
    // persist to storage
    await writeFeatureIds(jiraContext, jiraFeatureIds);
    // update state
    setJiraFeatureIds(jiraFeatureIds);
  };
  const onAdd = (featureId: string) => onChange([...jiraFeatureIds, featureId]);
  const onRemove = (featureId: string) =>
    onChange(jiraFeatureIds.filter((each) => String(each) !== featureId));

  const projectUrl = `${FLAGSMITH_APP}/project/${projectId}`;
  return (
    <Fragment>
      <IssueFlagTable
        projectUrl={projectUrl}
        apiKey={apiKey}
        environments={environments}
        flagsmithFeatures={features}
        jiraFeatureIds={jiraFeatureIds}
        onRemove={onRemove}
        canEdit={canEdit}
      />
      {canEdit && (
        <IssueFlagForm flagsmithFeatures={features} jiraFeatureIds={jiraFeatureIds} onAdd={onAdd} />
      )}
    </Fragment>
  );
};

type EditActionProps = {
  editing: boolean;
  setEditing: (editing: boolean) => void;
};

const EditAction = ({ editing, setEditing }: EditActionProps) => (
  <IssuePanelAction
    text={editing ? "View feature flags" : "Edit feature flags"}
    onClick={() => {
      setEditing(!editing);
    }}
  />
);

// eslint-disable-next-line react/display-name
export default () => {
  // get initial values from storage
  const [apiKey, setApiKey] = useState(readApiKey);
  const [organisationId, setOrganisationId] = useState(readOrganisationId);
  const jiraContext = useJiraContext();
  const [projectId, setProjectId] = useState(() => readProjectId(jiraContext));
  const [jiraFeatureIds, setJiraFeatureIds] = useState(() => readFeatureIds(jiraContext));
  const [canEdit, setCanEdit] = useState(() => canEditIssue(jiraContext));
  const [editing, setEditing] = useState(!(jiraFeatureIds ?? []).length);

  const actions = canEdit
    ? [<EditAction key="edit" editing={editing} setEditing={setEditing} />]
    : [];
  return (
    <IssuePanel actions={actions}>
      <ErrorWrapper
        renderChild={(setError) => (
          <IssueFlagPanel
            setError={setError}
            apiKey={apiKey}
            jiraContext={jiraContext}
            organisationId={organisationId}
            projectId={projectId}
            jiraFeatureIds={jiraFeatureIds}
            canEdit={canEdit && editing}
          />
        )}
        onRetry={async () => {
          setApiKey(await readApiKey());
          setOrganisationId(await readOrganisationId());
          setProjectId(await readProjectId(jiraContext));
          setJiraFeatureIds(await readFeatureIds(jiraContext));
          setCanEdit(await canEditIssue(jiraContext));
        }}
      />
    </IssuePanel>
  );
};
