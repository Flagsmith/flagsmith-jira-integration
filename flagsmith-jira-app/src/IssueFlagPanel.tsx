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
  features: FeatureModel[];
  featureIds: string[];
  onAdd: (featureId: string) => Promise<void>;
};

const IssueFlagForm = ({ features, featureIds, onAdd }: IssueFlagFormProps) => {
  const addableFeatures = features.filter((feature) => !featureIds.includes(String(feature.id)));

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
  features: FeatureModel[];
  featureIds: string[];
  onRemove: (featureId: string) => Promise<void>;
  canEdit: boolean;
};

const IssueFlagTable = ({
  projectUrl,
  apiKey,
  environments,
  features,
  featureIds,
  onRemove,
  canEdit,
}: IssueFlagTableProps) => {
  const [environmentFlags, setEnvironmentFlags] = useState<any>([]);

  useEffect(async () => {
    // Filtered features by comparing their IDs with the feature IDs stored in Jira.
    const featuresFiltered = features.filter((f) => featureIds.includes(String(f.id)));
    try {
      if (environments.length > 0 && featuresFiltered.length > 0) {
        const featureState: any = {};
        // Iterate over each filtered feature.
        for (const feature of featuresFiltered) {
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
            featureState[String(feature.name)].environments.push(ffData);
          }
        }
        const ffArray = Object.keys(featureState).map((featureName) => featureState[featureName]);
        setEnvironmentFlags(ffArray);
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
  }, [apiKey, featureIds, environments, features]);

  if (featureIds.length === 0) {
    return <Text>No feature flags are linked to this issue.</Text>;
  }

  let first = true;
  return (
    <Fragment>
      {environmentFlags.map((environmentFlag: FlagModel) => {
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
                  const segments = environmentFlags.filter(
                    (each: EnvironmentFeatureState) =>
                      String(each.feature) === String(environmentFlag.feature_id) &&
                      each.feature_segment !== null,
                  ).length;
                  const identities = environmentFlags.filter(
                    (each: EnvironmentFeatureState) =>
                      String(each.feature) === String(environmentFlag.feature_id) &&
                      each.identity !== null,
                  ).length;
                  return (
                    <Row key={String(environmentFlag.feature_id)}>
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
                    onClick={() => onRemove(environmentFlag.feature_id)}
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
  featureIds: string[] | undefined;
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
  const [featureIds, setFeatureIds] = useState(props.featureIds ?? []);
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

  const onChange = async (featureIds: string[]) => {
    // persist to storage
    await writeFeatureIds(jiraContext, featureIds);
    // update state
    setFeatureIds(featureIds);
  };
  const onAdd = (featureId: string) => onChange([...featureIds, featureId]);
  const onRemove = (featureId: string) =>
    onChange(featureIds.filter((each) => String(each) !== featureId));

  const projectUrl = `${FLAGSMITH_APP}/project/${projectId}`;
  return (
    <Fragment>
      <IssueFlagTable
        projectUrl={projectUrl}
        apiKey={apiKey}
        environments={environments}
        features={features}
        featureIds={featureIds}
        onRemove={onRemove}
        canEdit={canEdit}
      />
      {canEdit && <IssueFlagForm features={features} featureIds={featureIds} onAdd={onAdd} />}
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
  const [featureIds, setFeatureIds] = useState(() => readFeatureIds(jiraContext));
  const [canEdit, setCanEdit] = useState(() => canEditIssue(jiraContext));
  const [editing, setEditing] = useState(!(featureIds ?? []).length);

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
            featureIds={featureIds}
            canEdit={canEdit && editing}
          />
        )}
        onRetry={async () => {
          setApiKey(await readApiKey());
          setOrganisationId(await readOrganisationId());
          setProjectId(await readProjectId(jiraContext));
          setFeatureIds(await readFeatureIds(jiraContext));
          setCanEdit(await canEditIssue(jiraContext));
        }}
      />
    </IssuePanel>
  );
};
