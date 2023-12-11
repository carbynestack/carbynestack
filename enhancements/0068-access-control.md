# CSEP-0068: Access Control

<!-- TOC -->

- [CSEP-0068: Access Control](#csep-0068-access-control)
  - [Summary](#summary)
  - [Motivation](#motivation)
    - [Goals](#goals)
    - [Non-Goals](#non-goals)
  - [Proposal](#proposal)
    - [Policy Decision Point (PDP)](#policy-decision-point-pdp)
    - [Policy Enforcement Point (PEP)](#policy-enforcement-point-pep)
    - [Policies](#policies)
      - [Policy Management](#policy-management)
        - [CLI Support](#cli-support)
      - [Policy Identifiers](#policy-identifiers)
    - [Amphora](#amphora)
      - [Operations](#operations)
      - [Policy Decision Context](#policy-decision-context)
        - [User-facing API](#user-facing-api)
        - [Intra-VCP API](#intra-vcp-api)
    - [Ephemeral](#ephemeral)
      - [Function Image Digests](#function-image-digests)
      - [Output Policies](#output-policies)
    - [Default Policies](#default-policies)
    - [Trust Model](#trust-model)
    - [User Stories](#user-stories)
      - [Story 1](#story-1)
      - [Story 2](#story-2)
    - [Notes/Constraints/Caveats](#notesconstraintscaveats)
    - [Risks and Mitigations](#risks-and-mitigations)
  - [Design Details](#design-details)
  - [Alternatives](#alternatives)
  - [Infrastructure Needed](#infrastructure-needed)
  - [Scratchpad](#scratchpad)

<!-- TOC -->

## Summary

The goal of this CSEP is the augmentation of Carbyne Stack with an access
control subsystem to protect user-facing APIs via a cloud-native policy engine.

## Motivation

Carbyne Stack today has no means of restricting access to Amphora objects and
Ephemeral functions. This CSEP is about closing this gap by adding an access
control subsystem to Carbyne Stack. It relies on the authentication
functionality provided already by Thymus.

### Goals

- Enforcing access control on Amphora and Ephemeral user-facing APIs
- Providing policy management functionality, i.e., CR(U)D operations for
  policies
- Definition of default policies to be used by a vanilla, non-customized CS
  deployments as a secure starting point

### Non-Goals

- Non-essential features of the authorization systems that can be added later
- User authentication (see [CSEP-0049](0049-end-user-authentication.md))
- Invocation policies for function, i.e., who is allowed to execute a function
- Support for flexible Ephemeral function output object policies
- Support for multi-tenancy settings
- Any kind of UI

## Proposal

### Policy Decision Point (PDP)

[OPA](https://www.openpolicyagent.org/) is used to implement the *Policy
Decision Point* (PDP). To allow for making low-latency access control decisions
the OPA engine is deployed as a daemon set consisting of a pod running at each
Kubernetes node.

OPA is deployed via the respective helm chart provided by the
[kube-mgmt](https://github.com/open-policy-agent/kube-mgmt) project.

### Policy Enforcement Point (PEP)

Policy enforcement happens in the Amphora and Ephemeral services.
[Spring Integration](https://www.openpolicyagent.org/integrations/springsecurity-api/)
is used for Amphora. The OPA
[Go SDK](https://www.openpolicyagent.org/docs/latest/integration/#integrating-with-the-go-sdk)
is used to implement the PEP in Ephemeral.

### Policies

Policies are defined as [OPA](https://www.openpolicyagent.org/) policies written
in the [Rego](https://www.openpolicyagent.org/docs/latest/policy-language/)
language.

#### Policy Management

Policies are stored as Kubernetes `ConfigMaps`. They are discovered
automatically and loaded into OPA by a controller provided by
[kube-mgmt](https://github.com/open-policy-agent/kube-mgmt). VC owners use
Kubernetes tooling, e.g. `kubectl` to manage policies.

Additional tooling may be provided later on top of this basic functionality.
Policies could be read from external sources (e.g. IPFS or GitHub repositories)
in the future.

The deployed policies can be inspected by VC users via a REST API. Assuming a
VCP base URL of `https://apollo.carbynestack.io`, the API is exposed at the path
`https://apollo.carbynestack.io/iam/policies`.

The user-facing API consists of the following resources and operations:

| Resource                | Operation | Description                                                                                                                          |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/policies`             | GET       | Returns a list of all deployed policies. Does not include the policy definition itself but metadata only, e.g., `name`, `policy-id`. |
| `/policies/<policy-id>` | GET       | Returns the policy identified by the given policy identifier.                                                                        |

##### CLI Support

The Carbyne Stack CLI provides a `policy` sub-command to interact with the
policy API. The provided commands are `list` and `get <pid|name>`. The Amphora
subcommand allows for specifying a policy identifier when creating secrets. The
Amphora subcommands handle cases when executing the operation is denied by the
policy. These functionalities are supported by the respective Java clients.

#### Policy Identifiers

A policy is identified by a stable and unique content-based secure hash called
the *Policy ID* (PID) implemented as a
[multihash](https://multiformats.io/multihash/). PIDs are used to refer to
policies when being attached to Amphora secrets or Ephemeral executions. Because
PIDs are content-based, a user can be confident that the policies associated
with a secret or function cannot be altered without notice.

The PID is computed by a Kubernetes mutating admission controller that
intercepts the generation of config maps that contain policies. For this, the
policy code is *canonicalized* and then used as the input to the hash function.
The formatting to get a canonicalized policy representation is performed using
the
[formatter logic](https://github.com/open-policy-agent/opa/blob/main/format/format.go)
used by `opa format`.

The PID is stored as an entry in the metadata section of the config map under
the key `thymus.carbynestack.io/policy-id`, i.e.,

```yaml
kind: ConfigMap
metadata:
  name: my-policy
  labels:
    openpolicyagent.org/policy: rego
    thymus.carbynestack.io/policy-id: <redacted>
apiVersion: v1
data:
  include.rego: |
    allow := true
```

### Amphora

Amphora secret share objects are extended to support the following new
*mandatory* labels

| Name     | Description                                                       | Constraints            |
| -------- | ----------------------------------------------------------------- | ---------------------- |
| `policy` | The identifier of the policy attached to the secret share object. | Single non-empty value |
| `owner`  | The identifier of the user who owns the object.                   | Single non-empty value |

Values for both labels have to be provided on creation of a secret share object.

#### Operations

Every operation on the secret share object, on both value and metadata, is
governed by the attached policy. The supported operations are:

| Operation         | Description                                                          |
| ----------------- | -------------------------------------------------------------------- |
| `Delete`          | The secret share object is to be deleted.                            |
| `Data:Read`       | The value of the secret share object is to be read.                  |
| `Metadata:Read`   | A label attached to the secret share object is to be read.           |
| `Metadata:Write`  | A label attached to the secret share object is to be (over-)written. |
| `Metadata:Delete` | A label attached to the secret share object is to be deleted.        |

Note that policies for operations relevant for buckets, i.e., listing secret
share objects and creating secrets, are hardcoded in the implementation of this
CSEP. Secrets can be created and listed by every authenticated user and by all
Ephemeral functions.

#### Policy Decision Context

The following information is provided to OPA when evaluating the attached
policy:

##### User-facing API

| Key         | JSON Type        | Description                                                                                                                       |
| ----------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `principal` | `String`         | The authenticated user.                                                                                                           |
| `operation` | `String`         | The operation to be performed on the secret share object. One of the operations from the [list of operations](#operations) above. |
| `labels`    | `Object[String]` | The metadata labels attached to the secret share object.                                                                          |

##### Intra-VCP API

When called by the Ephemeral service from within the same VCP, the context is
populated by Ephemeral with the following information:

| Key         | JSON Type               | Description                                                                                     |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `principal` | `String`                | The authenticated user that triggered the function activation.                                  |
| `fid`       | `String`                | The [Function Image Digest](#function-image-digests) of the activated knative service revision. |
| `inputs`    | `Array[Object[String]]` | Labels of all secret share objects used as input for the activation.                            |

The `fid` and `principal` values can be used to control who is allowed to run
which code on a secret share object. The `inputs` value can be used to express
requirements on the set of inputs, e.g., that a secret share object might be
used for a function invocation only if at least N other inputs from N other
authenticated users are used.

### Ephemeral

We assume that Ephemeral has been adapted according to the following
requirements:

- The functionality to provide code when invoking Ephemeral has been removed. On
  demand compilation is no longer supported. Only the compiled code contained in
  the function image can be invoked.
- The Ephemeral image is split into an orchestrator image and a function image
  (e.g., MP-SPDZ runtime + libraries + program code).

#### Function Image Digests

When an Ephemeral image is deployed, Knative resolves the image tags for all
containers of the pod into image their image digests (see
[here](https://knative.dev/docs/serving/tag-resolution/) for details). The
digest is called the *Function Image Digest* (FID) and can be used as a basis
for making access decisions. Data owners use out-of-band mechanisms to explore
the code behind a FID.

The Thymus admission controller makes the image digest available to the
Ephemeral pod using an environment variable. Setting the `reinvocationPolicy` to
`IfNeeded` ensures that the admission controller is retriggered in case the
images tags have not been resolved yet (see
[here](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#reinvocation-policy).

#### Output Policies

Amphora secrets created as a result of an Ephemeral function activation are
owned by the authenticated user that triggered the execution. The
[default policy](#default-policies) is attached to it.

### Default Policies

By default the owner of an Amphora secret has all rights. All other
authenticated users have no rights.

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
