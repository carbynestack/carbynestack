# Triaging Guide

These guidelines serve as a primary document for triaging incoming issues to
Carbyne Stack.

## What Is Triaging?

Issue triage is a process by which the Carbyne Stack project maintainers review
new GitHub issues and requests, and organizes them to be actioned. Triaging
involves categorizing issues and pull requests based on factors such as
priority/urgency and the issue kind (bug, feature, etc.).

Triage happens in the regular Carbyne Stack maintainer meeting.

## Running a Triage Session

In a typical triage session, maintainers sort through every issue that they
haven't triaged so far. We usually follow this process:

1. Identify issues and PRs not triaged so far using GitHub search machinery. For
   each issue / PR we iterate through steps 2-4.
1. Read through the comments and the code briefly to understand what the issue
   is about.
1. Discuss briefly the technical implications.
1. Depending on the findings assign the appropriate `triage`, `kind`,
   `help wanted` or `good first issue` labels. Issues might be closed or
   rejected if appropriate.

Details about each of the above steps are provided in the following section.

## Triage Flow

This guide walks you through the triaging flow used in the Carbyne Stack
project.

### Identify Issues / PRs needing triage

The first step in a successful triage meeting is reviewing issues / PRs awaiting
triage. Labels are the primary tools for triaging. Note that the `needs-triage`
label is assigned automatically to all newly created and reopened issues and
PRs. All issues and (non-draft) PRs that need triage are listed
[here][needs-triage-url]. The list of labels we use for triaging is available
[here][triage-relevant-labels].

After triaging is done, we remove the `needs-triage` label. The issue / PR is
either rejected and marked with the `triage/unresolved` label or accepted and
marked with the `triage/accepted` label.

## Triage Issues / PRs by Type

### Support Requests

Some people mistakenly use GitHub issues to file support requests. Usually they
are asking for help configuring some aspect of Carbyne Stack. To handle such an
issue, direct the author to use our [Discord][discord-server] server to ask for
assistance. Then apply the `kind/support` label, if not already present and
close the issue.

### Needs More Information

The `triage/needs-information` label indicates that an issue / PR needs more
information in order for work to continue; comment on it asking for the missing
information.

### Bugs

Before we start working on fixing a bug, we validate that the problem actually
is a bug by trying to reproduce it. As this typically creates some effort this
is done offline. The issue is revisited in upcoming maintainer meetings.

The initial flow is as follows:

- Apply the `kind/bug` label, if not already present.
- Search for duplicates to see if the issue has been reported already. If a
  duplicate is found, let the issue reporter know, reference the original issue,
  apply the `triage/duplicate` label and close the duplicate.
- [Define its priority](#define-priority).
- For high priority bugs, i.e., `priority/critical-urgent`, immediately assign a
  maintainer responsible for trying to reproduce.

After the assigned maintainer concluded his work on trying to reproduce the bug,
the following steps are performed depending on the outcome of the investigation:

If we can't reproduce it:

- Apply the `triage/not-reproducible` label.
- Contact the issue reporter with your findings.
- Close the issue if both the parties agree that it could not be reproduced.

If we need more information to further work on the issue:

- Let the reporter know it by adding an issue comment. Apply the
  `triage/needs-information` label.

If we can reproduce it:

- Apply the `triage/accepted` label.

### Help Wanted / Good First Issues

To identify issues that are specifically suitable for new contributors, we use
the [help wanted][help-wanted-issues] and [good first issue][good-first-issues]
labels.

### Kind Labels

We use [these][kind-labels] `kind` labels to specify the type of issue. Usually
the `kind` label is applied by the person submitting the issue. Issues that
feature the wrong `kind` (for example, support requests labelled as bugs) can be
corrected by someone triaging; double-checking is a good approach.

## Define Priority

We use GitHub labels for prioritization. If an issue lacks a `priority` label,
this means it has not been reviewed and prioritized yet.

| Priority label                    | What it means                                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `priority/critical-urgent`        | Things are burning. We will make sure that these issues / PRs are being actively worked on ASAP. These should be fixed before the next release.                                                                                                                                            |
| `priority/important-soon`         | Must be staffed and worked on either currently or very soon - ideally in time for the next release. Important, but wouldn't block a release.                                                                                                                                               |
| `priority/important-longterm`     | Important over the long term, but may not be currently staffed and/or may require multiple releases to complete. Wouldn't block a release.                                                                                                                                                 |
| `priority/backlog`                | General agreement that this is a relevant, but probably no one's available to work on it anytime soon. Community contributions would be most welcome in the meantime, though it might take a while to get them reviewed if reviewers are fully occupied with higher-priority issues / PRs. |
| `priority/awaiting-more-evidence` | Possibly useful, but not yet enough support to actually get it done.                                                                                                                                                                                                                       |

## Follow Up

### No Activity for 90 / 120 Days

When an issue / PR goes 90 days without activity, the `lifecycle/stale` label is
applied. You can block that by applying the `lifecycle/frozen` label
preemptively, or remove the label manually after it has been applied. If you
take neither step, the `lifecycle/rotten` label will be applied after another 30
days of inactivity and the issue will be auto-closed.

[discord-server]: https://discord.gg/fNsWRuJrgX
[good-first-issues]: https://github.com/carbynestack/carbynestack/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
[help-wanted-issues]: https://github.com/carbynestack/carbynestack/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22
[kind-labels]: https://github.com/carbynestack/carbynestack/labels?q=kind%2F
[needs-triage-url]: https://github.com/search?q=user%3Acarbynestack+is%3Aissue+is%3Apr+draft%3Afalse+label%3Aneeds-triage
[triage-relevant-labels]: https://github.com/carbynestack/carbynestack/labels?q=lifecycle%2F+triage%2F+kind%2F+priority%2F+needs-triage
