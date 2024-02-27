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
  // FeatureStateValue,
  // FlagModel,
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
  apiKey: string;
  projectUrl: string;
  environments: EnvironmentModel[];
  features: FeatureModel[];
  featureIds: string[];
  onRemove: (featureId: string) => Promise<void>;
  canEdit: boolean;
};

const IssueFlagTable = ({
  apiKey,
  environments,
  features,
  featureIds,
  onRemove,
  canEdit,
  projectUrl,
}: IssueFlagTableProps) => {
  const [environmentFlags, setEnvironmentFlags] = useState<any>([]);

  useEffect(async () => {
    const featuresFiltered = features.filter((f) => featureIds.includes(String(f.id)));
    try {
      if (environments.length > 0 && featuresFiltered.length > 0) {
        const flags: any = {};
        for (const feature of featuresFiltered) {
          flags[String(feature.name)] = { 
            name: feature.name,
            feature_id: feature.id,
            description: feature.description,
            environments: [],
          };

          for (const environment of environments) {
            const flagsData = await fetchFlags({
              apiKey,
              featureName: feature.name,
              envAPIKey: String(environment.api_key),
            });
            flagsData.name = environment.name;
            flags[String(feature.name)].environments.push(flagsData);
          }
        }
        const flagsArray = Object.keys(flags).map((featureName) => flags[featureName]);
        setEnvironmentFlags(flagsArray);
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
      {environmentFlags.map((environmentFlag: any) => {
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
                {environmentFlag?.environments.map((environment: any) => {
                  if (!environment) return null;
                  // count overrides
                  const segments = environment.feature_segment || 0;
                  const identities = environment.identity || 0;
                  return (
                    <Row key={String(environmentFlag.feature_id)}>
                      <Cell>
                        <Text>
                          <Link
                            href={`${projectUrl}/environment/${environment.api_key}/features?feature=${environmentFlag.feature_id}`}
                            appearance="link"
                            openNewTab
                          >
                            {environment.name}
                          </Link>
                        </Text>
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
                            appearance={environment.enabled ? "success" : "default"}
                            text={environment.enabled ? "on" : "off"}
                          />
                        </Text>
                      </Cell>
                      <Cell>
                        <Text>{environment.feature_state_value}</Text>
                      </Cell>
                      <Cell>
                        <Text>
                          <DateLozenge
                            value={new Date(environment.feature.created_date).getTime()} 
                          />
                        </Text>
                      </Cell>
                    </Row>
                  );
                })}
              </Table>
              {canEdit && (
                <ButtonSet>
                  <Button text="Unlink from issue" onClick={() => onRemove(environmentFlag.feature_id)} />
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
        apiKey={apiKey}
        projectUrl={projectUrl}
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
