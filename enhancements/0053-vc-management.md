# CSEP-0053: Virtual Cloud Management

<!-- TOC -->

- [Summary](#summary)
- [Motivation](#motivation)
  - [Goals](#goals)
  - [Non-Goals](#non-goals)
- [Proposal](#proposal)
  - [User Stories](#user-stories)
    - [Virtual Cloud Setup](#virtual-cloud-setup)
  - [Notes/Constraints/Caveats](#notesconstraintscaveats)
  - [Risks and Mitigations](#risks-and-mitigations)
- [Design Details](#design-details)
- [Alternatives](#alternatives)
- [Infrastructure Needed](#infrastructure-needed)

<!-- TOC -->

## Summary

The proposed Virtual Cloud Management service called _Spalding_ allows for
setting up a Virtual Cloud (VC) among a set of Virtual Cloud Providers (VCPs)
in Kubernetes-native way based on custom resources.

## Motivation

### Goals

- Mechanism for establishing mutual trust amongst all VCPs by exchanging
  certificates used for inter-VCP communication
- Explicit admission of remote VCPs based on their certificate
- Coordinated generation of a secret shared MAC key that is made available to
  the services of the VCP
- The implementation follows a kubernetes-native approach, i.e., uses custom
  resource definitions for representing the domain objects.

### Non-Goals

- Support for multi-tenancy, i.e., more than one virtual cloud using the same CS
  deployment
- Support for other MPC schemes / engines than MP-SPDZ

## Proposal

### User Stories

#### Virtual Cloud Setup

Multiple parties want to establish a virtual cloud by launching and configuring
_Virtual Cloud Providers_, i.e., Carbyne Stack instances. Each party deploys
Carbyne Stack, e.g., using the helm-based approach implemented in the CS SDK.

Each owner of a VCP creates a `VirtualCloud` custom resource

```yaml
apiVersion: "carbynestack.io/v1"
kind: VirtualCloud
metadata:
  name: Foo-VC
spec:
  parameters:
    prime: <<PRIME>>
    # Other parameters
  partners:
    - name: Party-1
      endpoint: https://foo.party-1.com
    - name: Party-2
      endpoint: https://party-2.de/foo
    # Other parties
status:
  state: admission
```

This VC CR will be different on all VCPs as the local VCP is not included in the
list. The VC resource goes through a series of states starting with the
_admission_ state.

Spalding uses the partner endpoints provided as part of the VC specification to
fetch the parameters and certificates from all partners and will create a
`VirtualCloudPartner` custom resource for each of them, e.g.,

```yaml
apiVersion: "carbynestack.io/v1"
kind: VirtualCloudPartner
metadata:
  name: Foo-VC-Party-1
spec:
  name: Party-1
  endpoint: https://foo.party-1.com
  parameters:
    prime: <<PRIME>>
    # Other parameters
  certificate:
    name: foo-vc-party-1-cert
    namespace: foo
status:
  admitted: false
```

The operators of the VCP can inspect the parameters and the certificate stored
in the K8s config map referenced by `certificate` and decide whether the remote
VCP is trustworthy and its parameters are compatible with the local ones. To
admit the VCP the operator creates a `VirtualCloudPartnerAdmission` custom
resource

```yaml
apiVersion: "carbynestack.io/v1"
kind: VirtualCloudPartnerAdmission
metadata:
  name: Foo-VC-Party-1-Admission
spec:
  partner: Foo-VC-Party-1
```

This will update the `admitted` status property in `Foo-VC-Party-1` to `true`.

```yaml
apiVersion: "carbynestack.io/v1"
kind: VirtualCloudPartner
metadata:
  name: Foo-VC-Party-1
spec:
  name: Party-1
  # omitted parts
status:
  admitted: true
```

After all partners defined in `Foo-VC` have been admitted, Spalding triggers
the initialization of the VC. This includes the generation of the secret-shared
MAC key and the HE key required for the offline phase by launching a pod
running the respective MP-SPDZ functionality. This includes exposing the
required network endpoints via Istio CRs. The VC CR state is updated to
`initializing`.

```yaml
apiVersion: "carbynestack.io/v1"
kind: VirtualCloud
metadata:
  name: Foo-VC
spec:
  # omitted parts
status:
  state: initializing
```

After the initialization process has been completed, the VC CR state is updated
to `starting`. The MAC key share is stored locally as a K8s secret. The HE key
is very large and is thus stored in a persistent volume that can be mounted by
Klyshko CRG pods. 

```yaml
apiVersion: "carbynestack.io/v1"
kind: VirtualCloud
metadata:
  name: Foo-VC
spec:
  # omitted parts
status:
  state: starting
```

Now the Carbyne Stack Foundation Services (Amphora, Castor, Ephemeral, and
Klyshko) are launched by Spalding through the creation of the respective custom
resources (e.g., SecretStore, TupleStore).

After all services are running (detected by inspecting state status of the
respective CRs) Istio Mutual TLS [Secure Gateways][istio-secure-gw] are
deployed to expose the services on the Internet. The VC CR state is updated to
`ready`.

```yaml
apiVersion: "carbynestack.io/v1"
kind: VirtualCloud
metadata:
  name: Foo-VC
spec:
  # omitted parts
status:
  state: ready
```

The VC is fully set up and is ready for use.

### Notes/Constraints/Caveats

This is an _optional_ section.

### Risks and Mitigations

## Design Details

## Alternatives

This is an _optional_ section.

## Infrastructure Needed

This is an _optional_ section.
