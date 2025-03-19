import {
  Box,
  Button,
  ButtonGroup,
  Form,
  FormFooter,
  FormSection,
  HelperMessage,
  Inline,
  Label,
  Lozenge,
  RequiredAsterisk,
  Select,
  Spinner,
  Strong,
  Text,
  useProductContext,
} from "@forge/react";
import React, { Fragment, useEffect, useId, useMemo, useState } from "react";

import { ApiError, usePromise } from "../../common";
import { readProjects } from "../flagsmith";
import { readProjectId, writeProjectId } from "../jira";
import { readApiKey, readOrganisationId } from "../storage";
import { WrappableComponentProps } from "./ErrorWrapper";

type ProjectSettingsFormProps = WrappableComponentProps & {
  apiKey: string;
  organisationId: string;
  projectId: string;
  saveProjectId: (projectId: string) => Promise<void>;
};

const ProjectSettingsForm = ({
  setError,
  apiKey,
  organisationId,
  saveProjectId,
  ...props
}: ProjectSettingsFormProps) => {
  // set form state from props
  const [projectId, setProjectId] = useState<string | null>(props.projectId);
  useEffect(() => {
    setProjectId(props.projectId);
  }, [props.projectId]);

  // get projects from Flagsmith API
  const [projects] = usePromise(
    async () => {
      try {
        return await readProjects({ apiKey, organisationId });
      } catch (error) {
        // ignore 404 (no projects) as that is handled by the form
        if (
          !Object.prototype.hasOwnProperty.call(error, "code") ||
          ![404].includes((error as ApiError).code)
        ) {
          setError(error as Error);
        }
        return [];
      }
    },
    [apiKey, organisationId],
    setError
  );
  const project = projects?.find((each) => String(each.id) === String(projectId));
  const currentProject = projects?.find((each) => String(each.id) === String(props.projectId));

  // update projectId when projects change
  useEffect(() => {
    if (projects && !project) {
      // unlike organisation, don't default to first project, clear selection instead
      void setProjectId(null);
    }
  }, [projects, project]);

  const projectInputId = useId();
  const projectOptions = useMemo(
    () =>
      projects?.map((model) => ({
        label: model.name,
        value: String(model.id),
      })),
    [projects]
  );
  const projectValue = projectOptions?.find((option) => option.value === projectId) ?? null;

  if (projects === undefined) {
    return <Spinner label="Loading projects" />;
  }

  const onSave = async () => {
    await saveProjectId(projectId ?? "");
  };

  const onClear = async () => {
    // clear saved state
    await saveProjectId("");
    // clear unsaved state
    setProjectId("");
  };

  const configured = !!apiKey && !!organisationId;
  const connected = configured && !!currentProject;

  return (
    <Fragment>
      <Box xcss={{ marginBottom: "space.300" }}>
        <Inline space="space.050" alignBlock="center">
          <Strong>Project:</Strong> {!!currentProject && <Text>{currentProject.name}</Text>}
          {configured && projects && projects.length === 0 && (
            <Lozenge appearance="removed">No projects to connect</Lozenge>
          )}
          {configured && projects && projects.length > 0 && !connected && (
            <Lozenge appearance="moved">Not connected</Lozenge>
          )}
          {connected && <Lozenge appearance="success">Connected</Lozenge>}
        </Inline>
      </Box>
      {configured && !!projectOptions && (
        <Form onSubmit={Promise.resolve}>
          <FormSection>
            <Label labelFor={projectInputId}>
              Project
              <RequiredAsterisk />
            </Label>
            <Select
              id={projectInputId}
              isRequired
              options={projectOptions}
              value={projectValue}
              onChange={(option) => setProjectId(option?.value ?? "")}
            />
            <HelperMessage>Choose your Flagsmith project</HelperMessage>
          </FormSection>
          <FormFooter>
            <ButtonGroup label="Form actions">
              <Button onClick={onSave} appearance="primary" isDisabled={!project}>
                Save
              </Button>
              <Button onClick={onClear}>Clear</Button>
            </ButtonGroup>
          </FormFooter>
        </Form>
      )}
    </Fragment>
  );
};

const ProjectSettingsPage: React.FC<WrappableComponentProps> = ({ setError }) => {
  // get configuration from storage
  const [apiKey] = usePromise(readApiKey, [], setError);
  const [organisationId] = usePromise(readOrganisationId, [], setError);
  // get project context extension
  const context = useProductContext();
  const extension = context?.extension;
  // get Flagsmith project ID from Jira project
  const [projectId, setProjectId] = usePromise(
    async () => {
      if (extension) {
        return await readProjectId(extension);
      }
      return undefined;
    },
    [extension],
    setError
  );

  /** Write Project ID to Jira project and update form state */
  const saveProjectId = async (projectId: string) => {
    if (extension) {
      await writeProjectId(extension, projectId);
      setProjectId(projectId);
    }
  };

  const ready =
    apiKey !== undefined &&
    organisationId !== undefined &&
    extension !== undefined &&
    projectId !== undefined;

  return ready ? (
    <ProjectSettingsForm
      setError={setError}
      apiKey={apiKey}
      organisationId={organisationId}
      projectId={projectId}
      saveProjectId={saveProjectId}
    />
  ) : (
    <Spinner label="Loading configuration" />
  );
};

export default ProjectSettingsPage;
