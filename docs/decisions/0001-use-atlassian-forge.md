# Use Atlassian Forge

- Status: Accepted

## Context and Problem Statement

Need to choose a development platform which allows UI modules to be added to Jira and to be distributed as an app in the
Atlassian Marketplace.

## Decision Drivers

- Overall requirement to quickly tick the box that Flagsmith has a Jira integration and offer MVP functionality which
  can be iterated on later

## Considered Options

- Atlassian Forge (newer mechanism, app hosted by Atlassian)
- Atlassian Connect (older mechanism, iframe only, app hosted by Flagsmith)

## Decision Outcome

Chosen option: "Atlassian Forge", because it allows for faster development of an app that meets requirements with
capacity to scale to meet future requirements.

### Positive Consequences

- Use of recommended platform with roadmap
- Built-in authentication, sandboxing, and hosting environments
- Built-in console to manage, distribute, and monitor apps
- CLI tooling for testing, deployment and installation
- Allows for Connect-style iframe apps if required

### Negative Consequences

- Limited to JavaScript/TypeScript but that is the UI stack we use anyway
- Less control over (but less responsibility for) hosting as it is provided by Atlassian

## Links

- <https://developer.atlassian.com/developer-guide/cloud-development-options/>
