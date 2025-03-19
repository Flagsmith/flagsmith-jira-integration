import { Box, Button, ButtonGroup, SectionMessage, Stack, Text } from "@forge/react";
import { Fragment, useState } from "react";

import { ApiError } from "../../common";

type SetError = (error?: Error) => void;

export type WrappableComponentProps = {
  setError: SetError;
};

export type ErrorWrapperProps = {
  renderChild: (setError: SetError) => JSX.Element;
  checkSettings?: string;
};

type SectionMessageAppearance = Parameters<typeof SectionMessage>[0]["appearance"];

const ErrorWrapper: React.FC<ErrorWrapperProps> = ({
  renderChild,
  checkSettings = "app and project",
}) => {
  const [error, setError] = useState<Error | undefined>(undefined);

  // render child if no error
  if (!error) return renderChild(setError);

  console.error(error);

  // otherwise render error message with retry button
  let appearance: SectionMessageAppearance = "error";
  let advice =
    "An unexpected error occured. Please try again later or contact Flagsmith support for advice.";

  // ApiError passed from backend will have code property
  if (
    Object.prototype.hasOwnProperty.call(error, "code") &&
    (error as ApiError).code >= 400 &&
    (error as ApiError).code < 500
  ) {
    appearance = "warning";
    advice = `Please check ${checkSettings} settings and try again.`;
  }

  return (
    <Fragment>
      <SectionMessage title={error.message ?? "Something went wrong"} appearance={appearance}>
        <Text>{advice}</Text>
      </SectionMessage>
      <Box xcss={{ marginTop: "space.300" }}>
        <Stack alignInline="end">
          <ButtonGroup label="Actions">
            <Button onClick={() => setError(undefined)}>Retry</Button>
          </ButtonGroup>
        </Stack>
      </Box>
    </Fragment>
  );
};

export default ErrorWrapper;
