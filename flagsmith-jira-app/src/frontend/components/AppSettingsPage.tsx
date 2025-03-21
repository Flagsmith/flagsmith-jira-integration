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
  Textfield,
} from "@forge/react";
import { Fragment, useEffect, useId, useMemo, useState } from "react";

import { ApiError, usePromise } from "../../common";
import { readOrganisations, readProjects } from "../flagsmith";
import {
  deleteApiKey,
  deleteOrganisationId,
  readHasApiKey,
  readOrganisationId,
  writeApiKey,
  writeOrganisationId,
} from "../storage";
import { WrappableComponentProps } from "./ErrorWrapper";

// 40 chars, same length as API key
const SENTINEL = "****************************************";

type AppSettingsFormProps = WrappableComponentProps & {
  hasApiKey: boolean;
  saveApiKey: (apiKey: string) => Promise<void>;
  organisationId: string | null;
  saveOrganisationId: (organisationId: string) => Promise<void>;
};

const AppSettingsForm = ({
  setError,
  saveApiKey,
  saveOrganisationId,
  ...props
}: AppSettingsFormProps): JSX.Element => {
  // set form state from props
  const [apiKey, setApiKey] = useState<string | null>(props.hasApiKey ? SENTINEL : null);
  useEffect(() => {
    setApiKey(props.hasApiKey ? SENTINEL : null);
  }, [props.hasApiKey]);

  const [organisationId, setOrganisationId] = useState<string | null>(props.organisationId);
  useEffect(() => {
    setOrganisationId(props.organisationId);
  }, [props.organisationId]);

  // get organisations from Flagsmith API (or empty list if missing/invalid API key)
  const [organisations] = usePromise(
    async () => {
      try {
        if (apiKey && apiKey.length === 40) {
          // use stored API key if current value is sentinel i.e. unchanged
          return await readOrganisations(apiKey === SENTINEL ? {} : { apiKey });
        }
      } catch (error) {
        // ignore 401 (invalid API key) and 404 (no organisations) as that is handled by the form
        if (
          !Object.prototype.hasOwnProperty.call(error, "code") ||
          ![401, 404].includes((error as ApiError).code)
        ) {
          setError(error as Error);
        }
      }
      // always return empty list
      return [];
    },
    [apiKey],
    setError,
  );

  const organisation = organisations?.find((each) => String(each.id) === String(organisationId));
  const currentOrganisation = organisations?.find(
    (each) => String(each.id) === String(props.organisationId),
  );

  // update organisationId when organisations change
  useEffect(() => {
    if (organisations && !organisation) {
      if (organisations.length > 1) {
        // ...select first organisation (if any)
        const organisationId = String(organisations[0]?.id);
        setOrganisationId(organisationId);
      } else {
        // ...otherwise clear selection
        setOrganisationId(null);
      }
    }
  }, [organisations, organisation]);

  // get projects for current organisation from Flagsmith API
  const [projects] = usePromise(async () => {
    try {
      if (props.organisationId) {
        return await readProjects({ organisationId: props.organisationId });
      } else {
        return undefined;
      }
    } catch (error) {
      // treat errors as "no projects"
      console.error(error);
      return [];
    }
  }, [props.organisationId]);

  const apiKeyInputId = useId();

  const organisationInputId = useId();
  const organisationOptions = useMemo(
    () =>
      organisations?.map((each) => ({
        label: each.name,
        value: String(each.id),
      })),
    [organisations],
  );

  const organisationValue =
    organisationOptions?.find((option) => option.value === organisationId) ?? null;

  if (organisations === undefined) {
    return <Spinner label="Loading organisations" />;
  }

  const onSave = async () => {
    if (apiKey !== SENTINEL) await saveApiKey(apiKey ?? "");
    await saveOrganisationId(organisationId ?? "");
  };

  const onClear = async () => {
    // clear saved state
    await saveApiKey("");
    await saveOrganisationId("");
    // clear unsaved state
    setApiKey("");
    setOrganisationId("");
  };

  // this status is a bit confusing as it reflects the current form state
  // rather than keeping track of whether the saved API key and organisation ID match each other
  const apiKeyInvalid = props.hasApiKey && organisations?.length === 0;
  const configured = props.hasApiKey && !!currentOrganisation && projects && projects.length > 0;

  return (
    <Fragment>
      <Box xcss={{ marginBottom: "space.300" }}>
        <Inline space="space.050" alignBlock="center">
          <Text>
            <Strong>Organisation:</Strong>
          </Text>{" "}
          {!!currentOrganisation && <Text>{currentOrganisation.name}</Text>}
          {!apiKeyInvalid && !currentOrganisation && (
            <Lozenge appearance="moved">Not connected</Lozenge>
          )}
          {apiKeyInvalid && (
            <Lozenge appearance="removed" maxWidth={"15rem"}>
              Invalid key or no organisations
            </Lozenge>
          )}
          {!apiKeyInvalid && !!currentOrganisation && !!projects && !configured && (
            <Lozenge appearance="removed">No projects to connect</Lozenge>
          )}
          {configured && <Lozenge appearance="success">Connected</Lozenge>}
        </Inline>
      </Box>
      <Form onSubmit={Promise.resolve}>
        <FormSection>
          <Label labelFor={apiKeyInputId}>
            API Key
            <RequiredAsterisk />
          </Label>
          <Textfield
            id={apiKeyInputId}
            type="password"
            isRequired
            minLength={40}
            maxLength={40}
            value={apiKey ?? ""}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <HelperMessage>Enter your Flagsmith API key</HelperMessage>
        </FormSection>
        {!!organisationOptions && (
          <FormSection>
            <Label labelFor={organisationInputId}>
              Organisation
              <RequiredAsterisk />
            </Label>
            <Select
              id={organisationInputId}
              isRequired
              options={organisationOptions}
              value={organisationValue}
              onChange={(option) => setOrganisationId(option.value)}
            />
            <HelperMessage>Choose your Flagsmith organisation</HelperMessage>
          </FormSection>
        )}
        <FormFooter>
          <ButtonGroup label="Form actions">
            <Button onClick={onSave} appearance="primary" isDisabled={apiKey?.length !== 40}>
              Save
            </Button>
            <Button onClick={onClear}>Clear</Button>
          </ButtonGroup>
        </FormFooter>
      </Form>
    </Fragment>
  );
};

const AppSettingsPage = ({ setError }: WrappableComponentProps): JSX.Element => {
  // get configuration from storage
  const [hasApiKey, setHasApiKey] = usePromise(
    async () => {
      return await readHasApiKey();
    },
    [],
    setError,
  );
  const [organisationId, setOrganisationId] = usePromise(readOrganisationId, [], setError);

  /** Write API Key to storage and update form state */
  const saveApiKey = async (apiKey: string) => {
    try {
      if (apiKey) {
        await writeApiKey({ apiKey });
      } else {
        await deleteApiKey();
      }
    } catch (error) {
      setError(error as Error);
    }
    setHasApiKey(!!apiKey);
  };

  /** Write Organisation ID to storage and update form state */
  const saveOrganisationId = async (organisationId: string) => {
    try {
      if (organisationId) {
        await writeOrganisationId({ organisationId });
      } else {
        await deleteOrganisationId();
      }
    } catch (error) {
      setError(error as Error);
    }
    setOrganisationId(organisationId);
  };

  const ready = hasApiKey !== undefined && organisationId !== undefined;

  return ready ? (
    <AppSettingsForm
      setError={setError}
      hasApiKey={hasApiKey}
      saveApiKey={saveApiKey}
      organisationId={organisationId}
      saveOrganisationId={saveOrganisationId}
    />
  ) : (
    <Spinner label="Loading configuration" />
  );
};

export default AppSettingsPage;
