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
  Spinner,
  Strong,
  Text,
  Textfield,
} from "@forge/react";
import { Fragment, useEffect, useId, useState } from "react";

import { ApiError, isOrganisationApiKey, usePromise } from "../../common";
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
  const [apiKey, setApiKey] = useState("");
  useEffect(() => {
    setApiKey("");
  }, [props.hasApiKey]);
  const usingStoredApiKey = props.hasApiKey && apiKey === "";

  const [organisationId, setOrganisationId] = useState<string | null>(props.organisationId);
  useEffect(() => {
    setOrganisationId(props.organisationId);
  }, [props.organisationId]);

  const [organisations] = usePromise(
    async () => {
      try {
        if (usingStoredApiKey) {
          return await readOrganisations({});
        }
        if (isOrganisationApiKey(apiKey)) {
          return await readOrganisations({ apiKey });
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
    [apiKey, props.hasApiKey],
    setError,
  );

  const organisation = organisations?.find((each) => String(each.id) === String(organisationId));
  const currentOrganisation = organisations?.find(
    (each) => String(each.id) === String(props.organisationId),
  );

  // update organisationId when organisations change
  useEffect(() => {
    if (organisations && !organisation) {
      if (organisations.length > 0) {
        // ...select first organisation (if any) e.g. the only organisation of an organisation API key
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

  if (organisations === undefined) {
    return <Spinner label="Loading organisations" />;
  }

  const onSave = async () => {
    if (!usingStoredApiKey) await saveApiKey(apiKey);
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
          <Strong>Organisation:</Strong>{" "}
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
            minLength={41}
            maxLength={41}
            placeholder={props.hasApiKey ? "Key saved, enter a new key to replace it" : ""}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <HelperMessage>Enter your Flagsmith Organisation API key</HelperMessage>
        </FormSection>
        {!!organisation && (
          <FormSection>
            <Label labelFor={organisationInputId}>Organisation</Label>
            <Textfield id={organisationInputId} isReadOnly value={organisation.name} />
            <HelperMessage>The Flagsmith organisation this API key belongs to</HelperMessage>
          </FormSection>
        )}
        <FormFooter>
          <ButtonGroup label="Form actions">
            <Button
              onClick={onSave}
              appearance="primary"
              isDisabled={!usingStoredApiKey && !isOrganisationApiKey(apiKey)}
            >
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
