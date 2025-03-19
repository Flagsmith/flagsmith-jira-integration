# Use UI Kit 2 (and Node 22 Runtime)

- Status: Accepted

## Context and Problem Statement

Need to choose a new JavaScript runtime that provides libraries for Jira and Flagsmith REST API
calls, storage, authorisation, etc.

Need to choose a new JavaScript library for UI components (text, tables, inputs, buttons, etc) and Jira UI (app settings,
project settings, issue panel, etc).

## Decision Drivers

- Forge Legacy Runtime reached end-of-life in Feb 2024
- UI Kit 1 reached end-of-life in Feb 2024
- Overall requirement for fastest route to maintain service

## Considered Options

- Forge Node Runtime 20 and 22 (generally available)
- UI Kit 2 (updated library, generally available)
- Custom UI (provide own UI components, use bridge to Jira components)

## Decision Outcome

Chosen option: "UI Kit 2", because it offers the least worst route to upgrading the existing UI. "Node 22 Runtime" because it is the current LTS, probably supported by Forge (documentation is contradictory but intention is there), and found to work in testing.

### Positive Consequences

- Reduced effort compared to Custom UI as UI Kit 2 provides pre-built UI components, similar to those currently used, styled to fit with Jira
- Greater compatibility as UI Kit 2 is expected to work well with Jira styling features such as dark mode, while providing finer style control than UI Kit 1
- UI Kit 2 uses real React (16) rather than React-like hooks, so can use more standard techniques  

### Negative Consequences

- Some quite painful changes from UI Kit 1 in terms of component changes, React hook changes, and bridging between frontend and backend execution, but this is unavoidable

## Links

- <https://developer.atlassian.com/platform/forge/function-reference/nodejs-runtime/>
- <https://developer.atlassian.com/platform/forge/ui-kit/components/>
- <https://developer.atlassian.com/platform/forge/custom-ui/iframe/>
- <https://ecosystem.atlassian.net/jira/polaris/projects/ROADMAP/ideas>
