import { Fragment, useEffect, useState } from "react";
import {
  Button,
  Form,
  JiraContext,
  Option,
  ProjectSettingsPage,
  Select,
  Lozenge,
  Strong,
  Text,
} from "@forge/react";

import { ErrorWrapper, useJiraContext } from "./common";
import { ProjectModel, fetchProjects } from "../flagsmith";
import { readProjectId, writeProjectId } from "../jira";
import { readApiKey, readOrganisationId } from "../storage";

type ProjectSettingsFormProps = {
  setError: (error: Error) => void;
  jiraContext: JiraContext;
  apiKey: string;
  organisationId: string;
  projectId: string | undefined;
};

const ProjectSettingsForm = ({
  setError,
  jiraContext,
  apiKey,
  organisationId,
  ...props
}: ProjectSettingsFormProps) => {
  // set initial state
  const [projectId, setProjectId] = useState(props.projectId);
  const [projects, setProjects] = useState([] as ProjectModel[]);

  // load projects
  useEffect(async () => {
    let projects = [] as ProjectModel[];
    try {
      // obtain projects from API
      projects = await fetchProjects({ apiKey, organisationId });
      // update form state
      setProjects(projects);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
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
  }, [apiKey, organisationId, String(projectId)]);

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
        <Strong>Status:</Strong> {!apiKey && <Lozenge appearance="moved">Not Configured</Lozenge>}
        {!!apiKey && projects.length === 0 && (
          <Lozenge appearance="removed">Invalid key or no projects</Lozenge>
        )}
        {projects.length > 0 && !project && <Lozenge appearance="moved">Not Connected</Lozenge>}
        {!!apiKey && !!project && <Lozenge appearance="success">Connected</Lozenge>}
      </Text>
      {projects.length > 0 && (
        <Form
          onSubmit={onSave}
          submitButtonText="Save"
          actionButtons={[
            <Button key="clear" onClick={onClear}>
              Clear
            </Button>,
          ]}
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
                key={String(project.id)}
                label={project.name}
                value={String(project.id)}
                defaultSelected={String(projectId) === String(project.id)}
              />
            ))}
          </Select>
        </Form>
      )}
    </Fragment>
  );
};

export default () => {
  // get initial values from storage/properties
  const [apiKey, setApiKey] = useState(readApiKey);
  const [organisationId, setOrganisationId] = useState(readOrganisationId);
  const jiraContext = useJiraContext();
  const [projectId, setProjectId] = useState(() => readProjectId(jiraContext));
  return (
    <ProjectSettingsPage>
      <ErrorWrapper
        renderChild={(setError) => (
          <ProjectSettingsForm
            setError={setError}
            jiraContext={jiraContext}
            apiKey={apiKey}
            organisationId={organisationId}
            projectId={projectId}
          />
        )}
        onRetry={async () => {
          setApiKey(await readApiKey());
          setOrganisationId(await readOrganisationId());
          setProjectId(await readProjectId(jiraContext));
        }}
      />
    </ProjectSettingsPage>
  );
};
