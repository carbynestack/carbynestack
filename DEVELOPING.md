# Developer Guide

This document describes the workflow for contributing using the GitHub
[fork and pull model](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/about-collaborative-development-models#fork-and-pull-model)
that consists of creating a fork, doing your work, issuing a pull request, and
merging that pull request back into the original project.

## Attribution

This guide is partly based on an excellent
[tutorial](https://gist.github.com/Chaser324/ce0505fbed06b947d962) of Chase
Pettit published under the MIT License.

## Preparing Your Development Environment

We use [pre-commit](https://pre-commit.com) to enforce best practices in Carbyne
Stack development. Before you start developing please install `pre-commit`
using:

```shell
pip3 install pre-commit
```

In your Carbyne Stack project git repository with a `.pre-commit-config.yaml`,
the git hook scripts can be installed using:

```shell
pre-commit install
```

`git`/`pre-commit` will run the configured hooks automatically on each commit
(and potentially other git commands) from now on.

Note that there is also a handy way of
[automatically enabling pre-commit on repositories](https://pre-commit.com/index.html#automatically-enabling-pre-commit-on-repositories)
. This frees you from the burden of remembering to manually install the Git
hooks after cloning a `pre-commit`-enabled repository.

## Creating a Fork

Just head over to the GitHub repository and click the "Fork" button. It's just
that simple. Let's assume you want to contribute to the `carbynestack` project
in the following. Once you've done that, you can use your favorite git client to
clone your repo or just head straight to the command line:

```shell
# Clone your fork to your local machine
git clone git@github.com:YOUR-USERNAME/carbynestack.git
```

## Keeping Your Fork Up to Date

While this isn't an absolutely necessary step, if you plan on doing anything
more than just a tiny quick fix, you'll want to make sure you keep your fork up
to date by tracking the original "upstream" repo that you forked. To do this,
you'll need to add a remote:

```shell
# Add 'upstream' repo to list of remotes
git remote add upstream https://github.com/carbynestack/carbynestack.git

# Verify the new remote named 'upstream'
git remote -v
```

Whenever you want to update your fork with the latest upstream changes, you'll
need to first fetch the upstream repo's branches and latest commits to bring
them into your repository:

```shell
# Fetch from upstream remote
git fetch upstream

# View all branches, including those from upstream
git branch -va
```

Now, checkout your own master branch and merge the upstream repo's master
branch:

```shell
# Checkout your master branch and merge upstream
git checkout master
git merge upstream/master
```

If there are no unique commits on the local master branch, git will simply
perform a fast-forward. However, if you have been making changes on master (in
the vast majority of cases you probably shouldn't
be)\
[see the next section](#doing-your-work), you may have to deal with
conflicts. When doing so, be careful to respect the changes made upstream.

Now, your local master branch is up-to-date with everything modified upstream.

## Doing Your Work

### Create a Branch

Whenever you begin work on a new feature or bugfix, it's important that you
create a new branch. Not only is it proper git workflow, but it also keeps your
changes organized and separated from the master branch so that you can easily
submit and manage multiple pull requests for every task you complete.

To create a new branch and start working on it:

```shell
# Checkout the master branch - you want your new branch to come from master
git checkout master

# Create and switch to a new branch named new-feature (give your branch its own
# simple informative name)
git checkout -b new-feature
```

### Commit Your Changes

Now, go to town hacking away and making whatever changes you want to. Along the
way, whenever you completed a self-contained piece of the high-level feature you
implement, commit your changes using:

```shell
git commit -sS
```

The flags `-s` and `-S` make sure that your commits are cryptographically
signed, and that the contribution made in that commit is signed off. See the
[Contributing Guide](CONTRIBUTING.md) for more information on this.

Please make sure to provide _meaningful_ git commit messages. A great discussion
of this topic is available from Chris Beams in his post
[How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/).
In short, please adhere to the following seven rules:

1. Separate subject from body with a blank line
1. Limit the subject line to 50 characters
1. Capitalize the subject line
1. Do not end the subject line with a period
1. Use the imperative mood in the subject line
1. Wrap the body at 72 characters
1. Use the body to explain what and why vs. how

An example from Chris' blog post looks like the following:

```text
Summarize changes in around 50 characters or less

More detailed explanatory text, if necessary. Wrap it to about 72
characters or so. In some contexts, the first line is treated as the
subject of the commit and the rest of the text as the body. The
blank line separating the summary from the body is critical (unless
you omit the body entirely); various tools like `log`, `shortlog`
and `rebase` can get confused if you run the two together.

Explain the problem that this commit is solving. Focus on why you
are making this change as opposed to how (the code explains that).
Are there side effects or other unintuitive consequences of this
change? Here's the place to explain them.

Further paragraphs come after blank lines.

- Bullet points are okay, too

- Typically a hyphen or asterisk is used for the bullet, preceded
  by a single space, with blank lines in between, but conventions
  vary here

If you use an issue tracker, put references to them at the bottom,
like this:

Resolves: #123
See also: #456, #789
```

Note that all parts except the subject line are optional, i.e. should be used
when needed. This does not mean that they should be omitted out of laziness.

## Adhere to Quality Standards

To support meeting high-quality standards, we use several metrics and supporting
tools. To get a pull request accepted by the maintainers you must make sure
that:

1. The test coverage is above `80%` and does not decrease by your code changes.
   This metric is tracked using the
   [Codecov](https://app.codecov.io/gh/carbynestack) tool.

1. You do not introduce code quality issues or increase technical debt. To
   fulfill these requirements, we use the static code analysis tool
   [Codacy](https://app.codacy.com/organizations/gh/carbynestack).

1. Your code and its (transitive) dependencies are free from security
   vulnerabilities. We rely on [Snyk](https://snyk.io/) to ensure that this
   requirement is met.

When submitting a pull request (see next section), the respective scans are
triggered automatically, and their results are made available as part of the PR
conversation. Make sure that all checks succeed before requesting a review by
the maintainers.

## Submitting a Pull Request

### Cleaning Up Your Work

Prior to submitting your pull request, you might want to do a few things to
clean up your branch and make it as simple as possible for the original repo's
maintainer to test, accept, and merge your work.

If any commits have been made to the upstream master branch, you should rebase
your development branch so that merging it will be a simple fast-forward that
won't require any conflict resolution work.

```shell
# Fetch upstream master and merge with your repo's master branch
git fetch upstream
git checkout master
git merge upstream/master

# If there were any new commits, rebase your development branch
git checkout newfeature
git rebase master
```

Now, it may be desirable to squash some of your smaller commits down into a few
larger more cohesive commits. You can do this with an interactive rebase:

```shell
# Rebase all commits on your development branch
git checkout 
git rebase -i master
```

This will open a text editor where you can specify which commits to squash.

### Submitting

Once you've committed and pushed all of your changes to GitHub, go to the page
for your fork on GitHub, select your development branch, and click the pull
request button. If you need to make any adjustments to your pull request, just
push the updates to GitHub. Your pull request will automatically track the
changes on your development branch and update.

## Accepting and Merging a Pull Request

Take note that unlike the previous sections which were written from the
perspective of someone that created a fork and generated a pull request, this
section is written from the perspective of the Carbyne Stack maintainers who are
handling an incoming pull request. Thus, where the "forker" was referring to the
original repository as `upstream`, we're now looking at it as the owner of that
original repository and the standard `origin` remote.

### Checking Out and Testing Pull Requests

Open up the `.git/config` file and add a new line under `[remote "origin"]`:

```shell
fetch = +refs/pull/*/head:refs/pull/origin/*
```

Now you can fetch and checkout any pull request so that you can test them:

```shell
# Fetch all pull request branches
git fetch origin

# Checkout out a given pull request branch based on its number
git checkout -b 999 pull/origin/999
```

Keep in mind that these branches will be read only, and you won't be able to
push any changes.

### Merging a Pull Request

If the contributor adhered to the flow of actions described above, the merge
will be a simple fast-forward. You can automatically do the merge by just
clicking the button on the pull request page on GitHub.
