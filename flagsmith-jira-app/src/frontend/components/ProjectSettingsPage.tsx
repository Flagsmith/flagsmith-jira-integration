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
  savedProjectIds: string[];
  saveProjectIds: (projectIds: string[]) => Promise<void>;
};

const ProjectSettingsForm = ({
  setError,
  saveProjectIds,
  savedProjectIds,
}: ProjectSettingsFormProps) => {
  // set form state from props
  const [projectIds, setProjectIds] = useState<string[]>(savedProjectIds);
  useEffect(() => {
    setProjectIds(savedProjectIds);
  }, [savedProjectIds]);

  // get projects from Flagsmith API
  const [projects] = usePromise(
    async () => {
      try {
        return await readProjects({});
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
    [],
    setError,
  );

  const currentProjects = projects?.filter((each) => savedProjectIds.includes(String(each.id)));
  const validProjectIds = new Set(projects?.map((project) => String(project.id)) ?? []);
  const allSelectedValid = projectIds.every((id) => validProjectIds.has(id));
  const hasChanges =
    projectIds.length !== savedProjectIds.length ||
    !projectIds.every((id) => savedProjectIds.includes(id));

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
    setProjectIds(newProjectIds);
  };

  // get features for current project from Flagsmith API
  const [features] = usePromise(async () => {
    try {
      if (savedProjectIds.length > 0) {
        return await readFeatures({ projectIds: savedProjectIds });
      } else {
        return undefined;
      }
    } catch (error) {
      // treat errors as "no features"
      console.error(error);
      return [];
    }
  }, [savedProjectIds]);

  if (projects === undefined) {
    return <Spinner label="Loading projects" />;
  }

  const onSave = async () => {
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
          {(currentProjects?.length ?? 0) > 0 && (
            <Text>{currentProjects!.map((project) => project.name).join(", ")}</Text>
          )}
          {currentProjects?.length === 0 && projects?.length > 0 && !connected && !hasChanges && (
            <Lozenge appearance="moved">Not connected</Lozenge>
          )}
          {projects?.length === 0 && <Lozenge appearance="removed">No projects to connect</Lozenge>}
          {(currentProjects ?? []).length > 0 && !!features && !connected && !hasChanges && (
            <Lozenge appearance="removed">No features to connect</Lozenge>
          )}
          {connected && !hasChanges && <Lozenge appearance="success">Connected</Lozenge>}
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
                isDisabled={!projectIds.length || !allSelectedValid || !hasChanges}
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
        setProjectIds(projectIds);
      }
    } catch (error) {
      setError(error as Error);
    }
  };

  const ready = extension !== undefined && projectIds !== undefined;

  return ready ? (
    <ProjectSettingsForm
      setError={setError}
      savedProjectIds={projectIds}
      saveProjectIds={saveProjectIds}
    />
  ) : (
    <Spinner label="Loading configuration" />
  );
};

export default ProjectSettingsPage;
