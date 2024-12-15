# @tscircuit/snippets-cli

A CLI for developing, managing and publishing snippets on [tscircuit.com](https://tscircuit.com).

## Usage

```bash
# Start a local server that watches for changes in
# this file or it's dependencies and updates the
# browser preview
snippets dev ./path/to/file.tsx
```

> Note: The snippets CLI uses the same configuration files as the [@tscircuit/cli](https://github.com/tscircuit/cli), so you may need to also install `npm install -g @tscircuit/cli` and run `tsci login` to authenticate!

## Installation

```bash
npm install -g @tscircuit/snippets-cli
```

## How it Works

When you run `snippets dev`, we start a local
server that uses the [@tscircuit/file-server](https://github.com/tscircuit/file-server) and [@tscircuit/runframe](https://github.com/tscircuit/runframe) (on the browser)
