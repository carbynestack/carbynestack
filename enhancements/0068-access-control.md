# CSEP-0068: Access Control

<!-- TOC -->

- [Summary](#summary)
- [Motivation](#motivation)
  - [Goals](#goals)
  - [Non-Goals](#non-goals)
- [Proposal](#proposal)
  - [User Stories](#user-stories)
    - [Story 1](#story-1)
    - [Story 2](#story-2)
  - [Notes/Constraints/Caveats](#notesconstraintscaveats)
  - [Risks and Mitigations](#risks-and-mitigations)
- [Design Details](#design-details)
- [Alternatives](#alternatives)
- [Infrastructure Needed](#infrastructure-needed)

<!-- TOC -->

## Summary

The goal of this CSEP is to augment Carbyne Stack with an access control
subsystem to protect user-facing APIs via a cloud-native policy engine.

## Motivation

Carbyne Stack today has no means of restricting access to Amphora objects and
Ephemeral functions. This CSEP is about adding access control to Carbyne Stack.
It relies on the authentication functionality provided by Thymus.

### Goals

- Enforcing access control in Amphora and Ephemeral user-facing APIs
- Providing policy management functionality, i.e., CR(U)D for policies
- Definition of default policies to be used by a vanilla, non-customized CS
  deployment

### Non-Goals

- User authentication (see [CSEP-0049](0049-end-user-authentication.md))
- Inter- and Intra-VCP service-to-service authorization
- Support for multi-tenancy settings
- Any kind of UI

## Proposal

- Deploy [OPA](https://www.openpolicyagent.org/) as Policy Decision Point (PDP)
  sidecar to Amphora and Ephemeral pods to allow for making low-latency access
  control decisions either explicitly via the respective helm charts or via a
  mutating admission controller living in the Thymus repository
- Use OPA
  [Spring Integration](https://www.openpolicyagent.org/integrations/springsecurity-api/)
  to implement the *Policy Enforcement Point* (PEP) in Amphora
- Use OPA
  [REST API](https://www.openpolicyagent.org/integrations/springsecurity-api/)
  directly to implement the PEP in Ephemeral
- Deploy OPA [kube-mgmt](https://github.com/open-policy-agent/kube-mgmt) to
  allow for K8s-native policy management via K8s `ConfigMaps`
- Extend Ephemeral to provide a secure hash of the workload, i.e., MPC program,
  libraries, etc., that can be used by data owners to specify which programs are
  allowed to consume their data as input. Use
  [multihash](https://multiformats.io/multihash/) to avoid strong coupling with
  a specific hash function. One could also look into container signing
  solutions, like [sigstore/cosign](https://github.com/sigstore/cosign), for
  that purpose.
- Extend the Amphora Intra-VCP interface to accept context data relevant for
  access control decision. This is used by Ephemeral when fetching input data.
  Basic context information provided by Ephemeral includes the workload hash,
  the user invoking the function, the metadata of all input objects used, the
  identifier of the policy used for the output objects.
- The functionality to provide code when invoking Ephemeral has to be removed.

### TBD

- Policy API
- content-based Policy IDs
- extend CLI to support policy viewing
- Policy attachment mechanism for Amphora objects and Ephemeral functions
- How to associate output object policies with Ephemeral functions?
- How to present functions (source code, output object policies, etc.) to data
  owners to allow them to decide whether to approve usage or not?
- Default policies
- ...

### Trust Model

TBD

### User Stories

This is an *optional* section.

#### Story 1

#### Story 2

### Notes/Constraints/Caveats

This is an *optional* section.

### Risks and Mitigations

- Complexity of Rego language -> provide good defaults

## Design Details

## Alternatives

- Kyverno
- Oso
- Cedar
- Zanzibar

## Infrastructure Needed

This is an *optional* section.

## Scratchpad

- Opa-kubemgmt for policy management
- Policy check via sidecar for Amphora, Ephemeral
- Defined JSON format including action, principal, tags, etc.
- Validation using JSON Schema
- E.g. ensure inputs from 10 different users; evaluation by ephemeral or
  providing context object to Amphora? Own action, e.g., "ingest"?
- Policies are identified by hash over canonicalized source code
- Default is that output object is owned by triggering principal
