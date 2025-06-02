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
import { Fragment, useEffect, useId, useMemo, useState } from "react";

import { ApiError, usePromise } from "../../common";
import { readFeatures, readProjects } from "../flagsmith";
import { readProjectIds, writeProjectIds } from "../jira";
import { WrappableComponentProps } from "./ErrorWrapper";

type ProjectSettingsFormProps = WrappableComponentProps & {
  projectIds: string[];
  saveProjectIds: (projectIds: string[]) => Promise<void>;
};

const ProjectSettingsForm = ({ setError, saveProjectIds, ...props }: ProjectSettingsFormProps) => {
  // set form state from props
  const [projectIds, setProjectIds] = useState<string[]>(props.projectIds);
  useEffect(() => {
    setProjectIds(props.projectIds);
  }, [props.projectIds]);

  // get projects from Flagsmith API
  const [projects] = usePromise(
    async () => {
      try {
        const loadedProjects = await readProjects({});
        console.log("[DEBUG] Loaded projects:", loadedProjects);
        return loadedProjects;
      } catch (error) {
        console.error("[ERROR] Failed to load projects:", error);
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
    [],
    setError,
  );

  const currentProjects = projects?.filter((each) => projectIds.includes(String(each.id)));
  const validProjectIds = new Set(projects?.map((project) => String(project.id)) ?? []);
  const allSelectedValid = projectIds.every((id) => validProjectIds.has(id));

  const projectInputId = useId();
  const projectOptions = useMemo(
    () =>
      projects?.map((model) => ({
        label: model.name,
        value: String(model.id),
      })),
    [projects],
  );

  const projectValue = projectOptions?.filter((option) => projectIds.includes(option.value)) ?? [];

  const onProjectChange = (options: Array<{ value: string }> | null) => {
    const newProjectIds = options?.map((option) => option.value) ?? [];
    console.log("[DEBUG] Project selection changed:", newProjectIds);
    setProjectIds(newProjectIds);
  };

  // get features for current project from Flagsmith API
  const [features] = usePromise(async () => {
    try {
      if (props.projectIds.length > 0) {
        const loadedFeatures = await readFeatures({ projectIds: props.projectIds });
        console.log("[DEBUG] Loaded features for projects:", props.projectIds, loadedFeatures);
        return loadedFeatures;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error("[ERROR] Failed to load features:", error);
      // treat errors as "no features"
      console.error(error);
      return [];
    }
  }, [props.projectIds]);

  if (projects === undefined) {
    return <Spinner label="Loading projects" />;
  }

  const onSave = async () => {
    console.log("[DEBUG] Saving project IDs:", projectIds);
    await saveProjectIds(projectIds);
  };

  const onClear = async () => {
    // clear saved state
    await saveProjectIds([]);
    // clear unsaved state
    setProjectIds([]);
  };

  const connected = !!currentProjects && features && features.length > 0;

  return (
    <Fragment>
      <Box xcss={{ marginBottom: "space.300" }}>
        <Inline space="space.050" alignBlock="center">
          <Strong>Project(s):</Strong>
          {/* Need to put this in a list */}
          {(currentProjects?.length ?? 0) > 0 && (
            <Text>{currentProjects!.map((project) => project.name).join(", ")}</Text>
          )}
          {currentProjects?.length === 0 && projects?.length > 0 && !connected && (
            <Lozenge appearance="moved">Not connected</Lozenge>
          )}
          {projects?.length === 0 && <Lozenge appearance="removed">No projects to connect</Lozenge>}
          {(currentProjects ?? []).length > 0 && !!features && !connected && (
            <Lozenge appearance="removed">No features to connect</Lozenge>
          )}
          {connected && <Lozenge appearance="success">Connected</Lozenge>}
        </Inline>
      </Box>
      {!!projectOptions && (
        <Form onSubmit={Promise.resolve}>
          <FormSection>
            <Label labelFor={projectInputId}>
              Project(s)
              <RequiredAsterisk />
            </Label>
            <Select
              id={projectInputId}
              isRequired
              isMulti
              options={projectOptions}
              value={projectValue}
              onChange={onProjectChange}
            />
            <HelperMessage>Choose your Flagsmith project(s)</HelperMessage>
          </FormSection>
          <FormFooter>
            <ButtonGroup label="Form actions">
              <Button
                onClick={onSave}
                appearance="primary"
                isDisabled={!projectIds.length || !allSelectedValid}
              >
                Save
              </Button>
              <Button onClick={onClear}>Clear</Button>
            </ButtonGroup>
          </FormFooter>
        </Form>
      )}
      {!allSelectedValid && (
        <HelperMessage>
          Some selected projects are no longer available. Please update your selection.
        </HelperMessage>
      )}
    </Fragment>
  );
};

const ProjectSettingsPage = ({ setError }: WrappableComponentProps): JSX.Element => {
  // get project context extension
  const context = useProductContext();
  const extension = context?.extension;
  // get Flagsmith project ID from Jira project
  const [projectIds, setProjectIds] = usePromise(
    async () => {
      if (extension) {
        return await readProjectIds(extension);
      }
      return [];
    },
    [extension],
    setError,
  );

  /** Write Project ID to Jira project and update form state */
  const saveProjectIds = async (projectIds: string[]) => {
    try {
      ProjectSettingsForm;
      if (extension) {
        await writeProjectIds(extension, projectIds);
        console.log("[DEBUG] Successfully wrote project IDs to Jira.");
        setProjectIds(projectIds);
      }
    } catch (error) {
      console.error("[ERROR] Failed to write project IDs to Jira:", error);
      setError(error as Error);
    }
  };

  const ready = extension !== undefined && projectIds !== undefined;

  return ready ? (
    <ProjectSettingsForm
      setError={setError}
      projectIds={projectIds}
      saveProjectIds={saveProjectIds}
    />
  ) : (
    <Spinner label="Loading configuration" />
  );
};

export default ProjectSettingsPage;
