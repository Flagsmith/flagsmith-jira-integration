import { Box, Button, Inline, Label, Select, ErrorMessage } from "@forge/react";
import { Fragment, useEffect, useId, useMemo, useState } from "react";

import { Feature } from "../flagsmith";

type IssueFlagFormProps = {
  features: Feature[];
  issueFeatureIds: string[];
  saveIssueFeatureIds: (featureIds: string[]) => Promise<void>;
  canEdit: boolean;
  editing: boolean;
  setEditing: (editing: boolean) => void;
};

const IssueFeaturesForm = ({
  features,
  saveIssueFeatureIds,
  canEdit,
  editing,
  setEditing,
  ...props
}: IssueFlagFormProps) => {
  // set form state from props
  const [featureIds, setFeatureIds] = useState<string[]>(props.issueFeatureIds);
  useEffect(() => {
    setFeatureIds(props.issueFeatureIds);
  }, [props.issueFeatureIds]);

  const featureInputId = useId();
  const featureOptions = useMemo(
    () =>
      features.map((each) => ({
        label: each.name,
        value: String(each.id),
      })),
    [features],
  );
  const featureValue = featureOptions.filter((option) => featureIds.includes(option.value)) ?? null;

  const onFeatureChange = async (options: { value: string }[]) => {
    const featureIds = options.map((option) => option.value);
    // optimistic update form state
    setFeatureIds(featureIds);
    // save to issue and update tables
    await saveIssueFeatureIds(featureIds);
  };

  if (features.length === 0) {
    return <ErrorMessage>Flagsmith project has no features</ErrorMessage>;
  }

  return (
    <Fragment>
      <Label labelFor={featureInputId}>Features</Label>
      <Inline grow="fill" alignBlock="center" space="space.100">
        <Box xcss={{ flexGrow: 1 }}>
          <Select
            id={featureInputId}
            isDisabled={!editing}
            isSearchable
            isMulti
            options={featureOptions}
            value={featureValue}
            onChange={onFeatureChange}
            placeholder="Choose Flagsmith features..."
          />
        </Box>
        {canEdit && (
          <Button onClick={() => setEditing(!editing)}>{editing ? "Done" : "Choose"}</Button>
        )}
      </Inline>
    </Fragment>
  );
};

export default IssueFeaturesForm;
