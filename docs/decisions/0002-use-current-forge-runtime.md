# Use Current Forge Runtime

- Status: Superseded by [Use UI Kit 2](0004-use-ui-kit-2.md)

## Context and Problem Statement

Need to choose a JavaScript runtime that executes the app code and provides libraries for Jira and Flagsmith REST API
calls, storage, authorisation, etc.

## Decision Drivers

- Overall requirement to quickly tick the box that Flagsmith has a Jira integration and offer MVP functionality which
  can be iterated on later

## Considered Options

- Current runtime (limited Node.js 14, generally available)
- Native runtime (full Node.js 18, in preview)

## Decision Outcome

Chosen option: "Current runtime", while avoiding falling into any of the breaking changes between the runtimes, i.e. use
latest Forge libraries, set Content-Type on API calls, don't rely on snapshotting. This allows for faster, more
reliable, development without ruling out a future change of runtime.

### Positive Consequences

- Stability as preview releases are subject to change
- Reliable tunnelling as local environment is same as deployment environment
- Ability to use runtime features (e.g. debugging) not yet available in new runtime
- Avoids confusion between Forge CLI Node.js (20) and Runtime Node.js (18)
- Minimal obstacles to migrate to the new runtime later

### Negative Consequences

- Potentially slower but should be fast enough, if not we can re-evaluate this decision
- Less Node features in the older runtime but we don't need them now

## Links

- <https://developer.atlassian.com/platform/forge/runtime-reference/native-nodejs-runtime/>
