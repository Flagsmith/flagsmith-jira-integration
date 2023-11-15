# Flagsmith Jira App

This project contains a Forge app written in TypeScript that provides a table of Flagsmith features in a Jira issue panel.
The app is based on the [Jira hello world app](https://developer.atlassian.com/platform/forge/build-a-hello-world-app-in-jira/) so any oddities in its configuration are as created by following those instructions.

See [developer.atlassian.com/platform/forge](https://developer.atlassian.com/platform/forge) for documentation and tutorials explaining Forge.

## Overview

The app works by adding three UI components to Jira:

- App Settings: UI to enter API Key and choose Organisation, persisted using Forge's Storage API.
- Project Settings: UI to choose Project, persisted as a Jira project property.
- Issue Panel: UI to choose and view Feature(s), persisted as a Jira issue property.

Data is pulled from the Flagsmith API on demand from the UI.

## Requirements

See [README.md](../README.md) in the containing folder for instructions to get set up.

## Quick start

### Developer Console

Manage, distribute and monitor Forge apps using the [Developer console](https://developer.atlassian.com/platform/forge/manage-your-apps/).

### Manifest

The app is defined in the `manifest.yml` file.

This includes the `id` of the app within Atlassian Cloud. Change this value to deploy code to a different app, e.g. one created in a developer account.

### Source Code

The three entry points to the app are contained in the `src/index.jsx` file. These define React components for App Settings, Project Settings and Issue Panel.

### Linting and Formatting

The Atlassian template provided some basic eslint config, to which sensible TypeScript/React/Prettier defaults have been added.

Execute `npm run eslint` to check linting and formatting.

### Deployment

Forge apps may be deployed to one of three environments:

- development: for testing changes
- staging: for a stable production-like version
- production: for distribution to users

Once an app is running in an environment, you can install it from that environment onto an Atlassian site.

By default, the CLI commands affect the development environment unless you specify another with the `--environment` flag. All the commands provide help given the `--help` flag.

First ensure you're in the `flagsmith-jira-app` folder, not the containing folder.

Use the `deploy` command and follow the prompts to persist code changes:

    forge deploy

Forge handles version numbering itself - the version number in `package.json` is not used. Generally, deployments that involve a change to permissions or authn/authz in `manifest.yml` cause a major increment and require the user to accept these changes to upgrade their installation. Other deployments cause a minor increment and upgrades are installed automatically.

See [Environments and versions](https://developer.atlassian.com/platform/forge/environments-and-versions/) for more information.

Use the `install` command and follow the prompts to install the app on a new site:

    forge install

Once the app is installed on a site, the site picks up changes you deploy without needing to rerun the install command. For major version changes the `--upgrade` flag must be used.

### Debugging

Use the `tunnel` command to proxy invocations locally (development environment only):

    forge tunnel

This seems to report a "Checking Docker image... failed" error, but it still works. See [Tunneling](https://developer.atlassian.com/platform/forge/tunneling/) for more information.

Use the `logs` command to see logs (development/staging environment only):

    forge logs

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.
