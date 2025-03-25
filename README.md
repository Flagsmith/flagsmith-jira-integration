# Flagsmith Jira Integration

This repository contains an outer folder to install and configure the Forge CLI with an inner folder containing the Jira
app itself.

See [developer.atlassian.com/platform/forge](https://developer.atlassian.com/platform/forge) for documentation and
tutorials explaining Forge.

## Architectural Decisions

See [docs/decisions/README.md](docs/decisions/README.md) for decision records.

## Forge CLI installation

The following steps reflect the usual [Getting started](https://developer.atlassian.com/platform/forge/getting-started/)
instructions but diverge for reproducability and portability reasons.

### Before you begin

Forge CLI requires [Docker](https://docs.docker.com/get-docker/) and Node.js 22 (LTS) to be installed:

- [Apple macOS](https://developer.atlassian.com/platform/forge/installing-forge-on-macos)
- [Linux](https://developer.atlassian.com/platform/forge/installing-forge-on-linux)

Forge recommend installing Node using using [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) but
[asdf](https://asdf-vm.com/) also works. Ensure you are using the correct Node.js version before executing any other
commands:

    nvm use

### Install the Forge CLI

Forge instructions start by
[installing the CLI globally](https://developer.atlassian.com/platform/forge/getting-started/#install-the-forge-cli)
but you can install it locally if you prefer:

    # install the CLI globally...
    npm i @forge/cli@11 -g
    # then install local dependencies
    npm ci --include=dev
    # ...or install the CLI locally
    npm i @forge/cli@11 --no-save

The Forge CLI is then available by typing `npx forge`.

### Log in with an Atlassian API token

Create an Atlassian API token to log in to the CLI. The CLI uses your token when running commands.

1. Go to <https://id.atlassian.com/manage/api-tokens>.
1. Click Create API token.
1. Enter a label to describe your API token. For example, forge-api-token.
1. Click Create.
1. Click Copy to clipboard and close the dialog.

The `forge login` command attempts to store credentials in your operating system keychain and may not work on all
platforms. Instead, we can skip this command and set environment variables instead.

### Using environment variables to login

Copy `.env-example` to `.env` and complete your Atlassian account email address and API token.

If you use [direnv](https://direnv.net/) these values should be picked up automatically. Alternatively use the activate
script:

    source <(./bin/activate)

This reads `.env` values into your shell environment and also sets an alias so you can execute Forge CLI commands by
typing `forge` without needing an `npx` prefix or to or mess with your path variable.

Check installation and authentication by typing e.g.:

    forge whoami

## Flagsmith Jira app deployment

First change into the app folder:

    cd flagsmith-jira-app

See [flagsmith-jira-app/README.md](flagsmith-jira-app/README.md).
