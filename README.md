# `tsci` (@tscircuit/cli)

Command line tool for creating tscircuit projects and interacting with the
tscircuit registry.

## Installation

```bash
npm install -g @tscircuit/cli
```

## Usage

The `tsci` CLI is 

```bash
# Interactively choose a command and options:
tsci

# Login
tsci login

# Create a Project
tsci init

# Develop a Project
tsci preview              # build and view circuit files in browser
tsci dev                  # build, view and edit circuit files in browser

# Manage Dependencies
tsci install
tsci add some-package
tsci remove some-package

# Lint a Project
tsci lint
tsci lint 2024            # use 2024 tscircuit recommendations

# Format a Project
tsci format
tsci format 2024

# Publish a Project
tsci publish

# View Your Project on Registry
tsci open
tsci view
```
