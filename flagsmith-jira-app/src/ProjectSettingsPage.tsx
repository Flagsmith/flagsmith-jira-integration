import ForgeUI, {
  Button,
  Form,
  Fragment,
  JiraContext,
  Option,
  ProjectSettingsPage,
  SectionMessage,
  Select,
  StatusLozenge,
  Strong,
  Text,
  useEffect,
  useState,
} from "@forge/ui";

import { ErrorWrapper, useJiraContext } from "./common";
import { Model, fetchProjects } from "./flagsmith";
import { canAdminProject, readProjectId, writeProjectId } from "./jira";
import { readApiKey, readOrganisationId } from "./storage";

// dummy call to stop the linter removing JSX-enabling import
ForgeUI;

type ProjectSettingsFormProps = {
  setError: (error: Error) => void;
  jiraContext: JiraContext;
  apiKey: string;
  organisationId: string;
  projectId: string;
  canAdmin: boolean;
};

const ProjectSettingsForm = ({
  setError,
  jiraContext,
  apiKey,
  organisationId,
  canAdmin,
  ...props
}: ProjectSettingsFormProps) => {
  // set initial state
  const [projectId, setProjectId] = useState(props.projectId);
  const [projects, setProjects] = useState([] as Model[]);

  // load projects
  useEffect(async () => {
    let projects = [];
    try {
      // obtain projects from API
      projects = await fetchProjects({ apiKey, organisationId });
      // update form state
      setProjects(projects);
    } catch (error) {
      setError(error);
    }

    // if id is unset or not known...
    const project = projects.find((each) => String(each.id) === String(projectId));
    if (!project) {
      if (projects.length > 0) {
        // unlike organisation, don't default to first project
      } else if (projectId) {
        // ...otherwise clear
        // persist to storage
        await writeProjectId(jiraContext, undefined);
        // update form state
        setProjectId(undefined);
      }
    }
  }, [apiKey, organisationId, projectId]);

  const onSave = async (data: Record<string, string>) => {
    // persist to storage
    await writeProjectId(jiraContext, data.projectId);
    // update form state
    setProjectId(data.projectId);
  };

  const onClear = async () => {
    await writeProjectId(jiraContext, undefined);
    // update form state
    setProjectId(undefined);
  };

  const project = projects.find((each) => String(each.id) === String(projectId));

  return (
    <Fragment>
      <Text>
        <Strong>Status:</Strong>{" "}
        {!apiKey && <StatusLozenge appearance="moved" text="Not Configured" />}
        {!!apiKey && projects.length === 0 && (
          <StatusLozenge appearance="removed" text="Invalid key or no projects" />
        )}
        {projects.length > 0 && !project && (
          <StatusLozenge appearance="moved" text="Not Connected" />
        )}
        {!!apiKey && !!project && <StatusLozenge appearance="success" text="Connected" />}
      </Text>
      {!canAdmin && project && (
        <Text>
          <Strong>Project: {project.name}</Strong>
        </Text>
      )}
      {!canAdmin && (
        <SectionMessage appearance="info">
          <Text>You do not have permission to configure this project.</Text>
        </SectionMessage>
      )}
      {canAdmin && projects.length > 0 && (
        <Form
          onSubmit={onSave}
          submitButtonText="Save"
          actionButtons={[<Button text="Clear" onClick={onClear} />]}
        >
          <Select
            name="projectId"
            label="Project"
            description="Choose your Flagsmith project"
            isRequired
            aria-required={true}
          >
            {projects.map((project) => (
              <Option
                label={project.name}
                value={String(project.id)}
                defaultSelected={String(projectId) === String(project.id)}
              />
            ))}
          </Select>
        </Form>
      )}
      {/* <Text>=={JSON.stringify(projectId)}==</Text> */}
    </Fragment>
  );
};

export default () => {
  // get initial values from storage/properties
  const [apiKey, setApiKey] = useState(readApiKey);
  const [organisationId, setOrganisationId] = useState(readOrganisationId);
  const jiraContext = useJiraContext();
  const [projectId, setProjectId] = useState(() => readProjectId(jiraContext));
  // get permissions
  // TODO if it's not possible to view project settings without editing them, this check can be removed
  const [canAdmin, setCanAdmin] = useState(() => canAdminProject(jiraContext));
  return (
    <ProjectSettingsPage>
      <ErrorWrapper<ProjectSettingsFormProps>
        Child={ProjectSettingsForm}
        jiraContext={jiraContext}
        apiKey={apiKey}
        organisationId={organisationId}
        projectId={projectId}
        canAdmin={canAdmin}
        onRetry={async () => {
          setApiKey(await readApiKey());
          setOrganisationId(await readOrganisationId());
          setProjectId(await readProjectId(jiraContext));
          setCanAdmin(await canAdminProject(jiraContext));
        }}
      />
    </ProjectSettingsPage>
  );
};
