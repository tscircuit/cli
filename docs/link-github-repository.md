# Link a package to GitHub

From a package directory, run:

```sh
tsci registry packages update --github-repo tscircuit/my-board
```

The command reads the package name from `package.json`, including the
`@tsci/owner.package` format. To select a package explicitly:

```sh
tsci registry packages update --package-name seveibar/my-board --github-repo tscircuit/my-board
```

Use `--unlink-github` to remove the link:

```sh
tsci registry packages update --package-name seveibar/my-board --unlink-github
```

This updates the same `github_repo_full_name` setting as the package settings
page on tscircuit.com. The package must already exist, and your authenticated
account must have permission to update it (`tsci auth login`). It does not create
a GitHub repository, upload local files, install a GitHub App, or publish a release.
Repository access and any GitHub App configuration are still managed through the
website. Changing this setting replaces an existing repository link.

GitHub linking can be combined with `--enable-public-dist` or
`--disable-public-dist`. Unspecified settings are preserved.
