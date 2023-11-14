import ForgeUI, {
  Button,
  ButtonSet,
  Fragment,
  JiraContext,
  SectionMessage,
  Text,
  useProductContext,
  useState,
} from "@forge/ui";

// dummy call to stop the linter removing JSX-enabling import
ForgeUI;

export const useJiraContext = () => useProductContext().platformContext as JiraContext;

export class ApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "ApiError";
    this.code = code || 502;
  }
}

type ErrorWrapperProps = {
  Child: (props: Record<string, unknown>) => JSX.Element;
  onRetry?: () => Promise<void>;
};

type SectionMessageAppearance = Parameters<typeof SectionMessage>[0]["appearance"];

export const ErrorWrapper = <TChildProps extends { setError: (error: Error) => void }>({
  Child,
  onRetry = undefined,
  ...props
}: ErrorWrapperProps & Omit<TChildProps, "setError">) => {
  const [error, setError] = useState<Error | undefined>(undefined);
  if (error) {
    let appearance: SectionMessageAppearance = "error";
    let advice =
      "An unexpected error occured. Please try again later or contact Flagsmith support for advice.";
    // for some reason (error instanceof ApiError) is false here :(
    if (
      Object.prototype.hasOwnProperty.call(error, "code") &&
      (error as ApiError).code >= 400 &&
      (error as ApiError).code >= 400 &&
      (error as ApiError).code < 500
    ) {
      appearance = "warning";
      advice = "Please check your app and project configuration and try again.";
    }
    return (
      <Fragment>
        <SectionMessage title={error.message} appearance={appearance}>
          <Text>{advice}</Text>
        </SectionMessage>
        <ButtonSet>
          <Button
            text="Retry"
            onClick={async () => {
              if (onRetry) await onRetry();
              setError();
            }}
          />
        </ButtonSet>
      </Fragment>
    );
  }
  // otherwise render child
  return <Child setError={setError} {...props} />;
};
