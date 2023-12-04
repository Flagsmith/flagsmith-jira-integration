# Use UI Kit

- Status: Accepted

## Context and Problem Statement

Need to choose a JavaScript library for UI components (text, tables, inputs, buttons, etc) and Jira UI (app settings,
project settings, issue panel, menus, modals, etc).

## Decision Drivers

- Overall requirement to quickly tick the box that Flagsmith has a Jira integration and offer MVP functionality which
  can be iterated on later.

## Considered Options

- UI Kit (original Jira UI component library)
- UI Kit 2 (updated library, under development, in preview)
- Custom UI (provide own UI components, use bridge to Jira components)

## Decision Outcome

Chosen option: "UI Kit", because it offers the simplest route to developing an MVP UI without ruling out more complex UI
in future. Keep UI and business logic code separate and avoid using withdrawn UI Kit features to minimise barriers to
transition.

### Positive Consequences

- Stability as preview releases are subject to change
- Reduced complexity as UI Kit 2 requires new native runtime and splits execution between frontend and backend
- Reduced effort as UI Kit provides pre-built UI components styled to fit with Jira
- Greater compatibility as UI Kit is expected to work well with Jira styling features such as dark mode
- Minimal obstacles to migrate to UI Kit 2 later

### Negative Consequences

- Less control over UI, but assuming it looks no worse than competing integrations, that should meet requirements, if
  not we can re-evaluate this decision

## Links

- https://developer.atlassian.com/platform/forge/ui-kit-components/
- https://developer.atlassian.com/platform/forge/ui-kit-2/
- https://developer.atlassian.com/platform/forge/custom-ui/iframe/
- https://trello.com/b/z2GIJ3xD/forge-roadmap-for-developers
