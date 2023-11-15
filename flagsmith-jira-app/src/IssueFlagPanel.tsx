import ForgeUI, {
  Badge,
  Button,
  ButtonSet,
  Cell,
  DateLozenge,
  Form,
  Fragment,
  Head,
  Heading,
  IssuePanel,
  IssuePanelAction,
  JiraContext,
  Option,
  Row,
  Select,
  StatusLozenge,
  Table,
  Text,
  useEffect,
  useState,
} from "@forge/ui";

import { ErrorWrapper, useJiraContext } from "./common";
import {
  EnvironmentModel,
  FeatureModel,
  FeatureStateValue,
  FlagModel,
  fetchEnvironments,
  fetchFeatures,
  fetchFlags,
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
        <Form onSubmit={(data) => onAdd(data.featureId)} submitButtonText="Add to issue">
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
  environments: EnvironmentModel[];
  features: FeatureModel[];
  flags: Record<string, FlagModel[]>;
  featureIds: string[];
  onRemove: (featureId: string) => Promise<void>;
  canEdit: boolean;
};

const IssueFlagTable = ({
  environments,
  features,
  flags,
  featureIds,
  onRemove,
  canEdit,
}: IssueFlagTableProps) => {
  if (featureIds.length === 0) {
    return <Text>No Flagsmith features are associated with this issue.</Text>;
  }

  return (
    <Fragment>
      {featureIds.map((featureId) => {
        const feature = features.find((each) => String(each.id) === String(featureId));
        return (
          !!feature && (
            <Fragment key={featureId}>
              <Heading size="small">
                {feature.name}
                {feature.description ? ": " : ""}
                {feature.description}
              </Heading>
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
                {environments.map((environment) => {
                  const environmentFlags = flags[String(environment.id)] ?? [];
                  // get the default state for this environment
                  const flag = environmentFlags.find(
                    (each) =>
                      String(each.feature) === String(featureId) &&
                      each.feature_segment === null &&
                      each.identity === null,
                  );
                  if (!flag) return null;
                  const value: Partial<FeatureStateValue> = flag.feature_state_value ?? {};
                  // count variations/overrides
                  const variations = flag.multivariate_feature_state_values.length;
                  const segments = environmentFlags.filter(
                    (each) =>
                      String(each.feature) === String(featureId) && each.feature_segment !== null,
                  ).length;
                  const identities = environmentFlags.filter(
                    (each) => String(each.feature) === String(featureId) && each.identity !== null,
                  ).length;
                  return (
                    <Row key={String(featureId)}>
                      <Cell>
                        <Text>{environment.name}</Text>
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
                        {value.type === "unicode" ? (
                          <Text>{JSON.stringify(value.string_value)}</Text>
                        ) : value.type === "int" ? (
                          <Text>{JSON.stringify(value.integer_value)}</Text>
                        ) : value.type === "bool" ? (
                          <Text>{JSON.stringify(!!value.boolean_value)}</Text>
                        ) : (
                          <Text>Unknown type: {value.type}</Text>
                        )}
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
                  <Button text="Remove from issue" onClick={() => onRemove(featureId)} />
                </ButtonSet>
              )}
            </Fragment>
          )
        );
      })}
    </Fragment>
  );
};

type Flags = Record<string, FlagModel[]>;

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
  const [flags, setFlags] = useState({} as Flags);

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
      if (environments.length > 0 && features.length > 0) {
        // obtain flags from API
        const flags: Flags = {};
        for (const environment of environments) {
          flags[String(environment.id)] = await fetchFlags({
            apiKey,
            environmentId: String(environment.id),
          });
        }
        // update form state
        setFlags(flags);
      }
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

  return (
    <Fragment>
      {/* <Text>{JSON.stringify(flags)}</Text> */}
      <IssueFlagTable
        environments={environments}
        features={features}
        flags={flags}
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
    text={editing ? "View features" : "Choose features"}
    onClick={() => {
      setEditing(!editing);
    }}
  />
);

// eslint-disable-next-line react/display-name
export default () => {
  const [editing, setEditing] = useState(false);
  // get initial values from storage
  const [apiKey, setApiKey] = useState(readApiKey);
  const [organisationId, setOrganisationId] = useState(readOrganisationId);
  const jiraContext = useJiraContext();
  const [projectId, setProjectId] = useState(() => readProjectId(jiraContext));
  const [featureIds, setFeatureIds] = useState(() => readFeatureIds(jiraContext));
  const [canEdit, setCanEdit] = useState(() => canEditIssue(jiraContext));

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
