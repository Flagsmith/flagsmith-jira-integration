import ForgeUI, {
  AdminPage,
  Button,
  Form,
  Option,
  Select,
  StatusLozenge,
  Strong,
  Text,
  TextField,
  useEffect,
  useState,
} from "@forge/ui";

import { ErrorWrapper } from "./common";
import { OrganisationModel, fetchOrganisations } from "./flagsmith";
import {
  deleteApiKey,
  deleteOrganisationId,
  readApiKey,
  readOrganisationId,
  writeApiKey,
  writeOrganisationId,
} from "./storage";

// dummy call to stop the linter removing unused import
ForgeUI;

// 40 chars, same length as API key
const SENTINEL = "****************************************";

type AppSettingsFormProps = {
  setError: (error: Error) => void;
  apiKey: string;
  organisationId: string;
};

const AppSettingsForm = ({ setError, ...props }: AppSettingsFormProps) => {
  // set initial state
  const [apiKey, setApiKey] = useState(props.apiKey);
  const [organisationId, setOrganisationId] = useState(props.organisationId);
  const [organisations, setOrganisations] = useState([] as OrganisationModel[]);

  // load organisations
  useEffect(async () => {
    let organisations = [] as OrganisationModel[];
    try {
      // obtain organisations from API
      organisations = await fetchOrganisations({ apiKey });
      // update form state
      setOrganisations(organisations);
    } catch (error) {
      // ignore 401 (invalid API key) and 404 (no organisations) as that is handled by this form
      if (
        !Object.prototype.hasOwnProperty.call(error, "code") ||
        ![401, 404].includes(error.code)
      ) {
        setError(error);
      }
      setOrganisations([]);
    }

    // if id is unset or not known...
    const organisation = organisations.find((each) => String(each.id) === String(organisationId));
    if (!organisation) {
      if (organisations.length > 0) {
        // ...set to first organisation (if any)
        const firstId = String(organisations[0].id);
        // persist to storage
        await writeOrganisationId(firstId);
        // update form state
        setOrganisationId(firstId);
      } else if (organisationId) {
        // ...otherwise clear
        // persist to storage
        await deleteOrganisationId();
        // update form state
        setOrganisationId(undefined);
      }
    }
  }, [apiKey]);

  const onSave = async (data: Record<string, string>) => {
    // persist to storage (which seemingly cannot store "")
    if (data.apiKey) {
      if (data.apiKey !== SENTINEL) await writeApiKey(data.apiKey);
    } else {
      await deleteApiKey();
    }
    if (data.organisationId) {
      await writeOrganisationId(data.organisationId);
    } else {
      await deleteOrganisationId();
    }
    // update form state
    if (data.apiKey !== SENTINEL) setApiKey(data.apiKey);
    setOrganisationId(data.organisationId);
  };

  const onClear = async () => {
    // persist to storage
    await deleteApiKey();
    await deleteOrganisationId();
    // update form state
    setApiKey(undefined);
    setOrganisationId(undefined);
  };

  const organisation = organisations.find((each) => String(each.id) === String(organisationId));

  return (
    <Form
      onSubmit={onSave}
      submitButtonText="Save"
      actionButtons={[<Button key="clear" text="Clear" onClick={onClear} />]}
    >
      <Text>
        <Strong>Status:</Strong>{" "}
        {!apiKey && <StatusLozenge appearance="moved" text="Not Configured" />}
        {!!apiKey && organisations.length === 0 && (
          <StatusLozenge appearance="removed" text="Invalid key or no organisation" />
        )}
        {!!apiKey && !!organisation && <StatusLozenge appearance="success" text="Configured" />}
      </Text>
      <TextField
        type="password"
        name="apiKey"
        label="API Key"
        description="Enter your Flagsmith API key"
        isRequired
        aria-required={true}
        defaultValue={apiKey ? SENTINEL : ""}
        autoComplete="off"
      />
      {organisations.length === 1 && !!organisation && (
        <Text>Organisation: {organisation.name}</Text>
      )}
      {organisations.length > 1 && (
        <Select
          name="organisationId"
          label="Organisation"
          description="Choose your Flagsmith organisation"
          isRequired
          aria-required={true}
        >
          {organisations.map((organisation) => (
            <Option
              key={String(organisation.id)}
              label={String(organisation.name)}
              value={String(organisation.id)}
              defaultSelected={String(organisationId) === String(organisation.id)}
            />
          ))}
        </Select>
      )}
      {/* <Text>=={JSON.stringify(organisationId)}==</Text> */}
    </Form>
  );
};

export default () => {
  // get initial values from storage
  const [apiKey, setApiKey] = useState(readApiKey);
  const [organisationId, setOrganisationId] = useState(readOrganisationId);
  return (
    <AdminPage>
      <ErrorWrapper<AppSettingsFormProps>
        Child={AppSettingsForm}
        apiKey={apiKey}
        organisationId={organisationId}
        onRetry={async () => {
          setApiKey(await readApiKey());
          setOrganisationId(await readOrganisationId());
        }}
      />
    </AdminPage>
  );
};
