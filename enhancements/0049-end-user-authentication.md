# CSEP-0049: End User Authentication

<!-- TOC -->

- [CSEP-0049: End User Authentication](#csep-0049--end-user-authentication)
  - [Summary](#summary)
  - [Motivation](#motivation)
    - [Goals](#goals)
    - [Non-Goals](#non-goals)
  - [Proposal](#proposal)
    - [User Stories](#user-stories)
      - [User Creation](#user-creation)
      - [Data Upload](#data-upload)
    - [Notes/Constraints/Caveats](#notesconstraintscaveats)
    - [Risks and Mitigations](#risks-and-mitigations)
  - [Design Details](#design-details)
    - [Deployment](#deployment)
    - [Services](#services)
    - [Service Provider Identity](#service-provider-identity)
    - [Exposing Endpoints](#exposing-endpoints)
    - [Clients](#clients)
    - [User Login and Consent](#user-login-and-consent)
    - [OAuth2 Client Setup](#oauth2-client-setup)
    - [CLI](#cli)
  - [Alternatives](#alternatives)
  - [Infrastructure Needed](#infrastructure-needed)

<!-- TOC -->

## Summary

The goal of this CSEP is to allow for management and authentication of users
accessing the Carbyne Stack user-facing APIs via OAuth2/OIDC standards.

## Motivation

Carbyne Stack today has no means of authenticating users. That means that
literally everyone with access to the APIs can do everything. Obviously, a
secure MPC system requires control over who is allowed to do what. This CSEP is
about adding user management and authentication to Carbyne Stack. On top of
this, access management can be implemented in the future.

### Goals

- Adding user management to Carbyne Stack.
- Allow OIDC-based user authentication that integrates with Istio's
  [end user authentication][istio-user-authentication] mechanism.
- Extend the clients and CLI to support authentication.

### Non-Goals

- User authorisation
- Inter- and Intra-VCP service-to-service authentication
- Support for multi-tenancy settings
- User management support for the CLI / clients
- Any kind of user self-service flows including related UIs
- Extracting authenticated user information in the service implementations

## Proposal

- Add [Ory Kratos][ory-kratos] for user management.
- Add [Ory Hydra][ory-hydra] for OAuth2/OIDC based authentication.
- Extend client and the CLI to handle authentication
- Configure Istio to enforce end-user authentication

### User Stories

The user stories described below make use of the following roles:

- A **Service Provider** is the party that offers a service on a Carbyne Stack
  virtual cloud by deploying and invoking MPC functionality.
- A **Data Owner** is a party that uploads data to virtual cloud.

#### User Creation

A service provider wants to enable a data owner to use his Carbyne Stack hosted
service on top of the data owners' data. To achieve this, he creates an Ory
Kratos [_Identity_][ory-identities] for the user on all VCPs of the VC. This can
be done on a VCP (available under the domain `apollo.carbynestack.io`) using
curl as follows:

```bash
curl --request POST -sL \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer <token>"
  --data '{
  "schema_id": "preset://email",
  "traits": {
    "email": "john.doe@foo.org"
  },
  "credentials": {
    "password": {
      "config": {
        "password": "secret"
      }
    }
  }
}' https://apollo.carbynestack.io/iam/admin/identities
```

The same has to be done on the other VCPs of the VC. Note that providing the
password here is only a workaround until we have self-service user flows
implemented ([non-goal](#non-goals) of this CSEP).

#### Data Upload

A data owner wants to upload secret data to a virtual cloud using the CLI.
Assuming the CLI has been configured to talk to the VCPs of the VC already using
`cs configure`, the following steps have to be performed:

1. Login using the CLI via

   ```bash
   cs login
   ```

   This will trigger the CLI to perform an OAuth2 Authorize Code Flow. As part
   of this flow a browser will be launched to allow the data owner to login and
   to provide consent. The access and refresh tokens received are eventually
   stored by the CLI in a configuration file.

1. Upload the data via

   ```bash
   cs amphora create-secret 42
   ```

   The VCP-specific access tokens received in the previous step are attached to
   the underlying requests by the Carbyne Stack Amphora client. The validity of
   the token is checked by Istio against the configured
   `Authentication  Policies`. If successful, the request is forwarded to the
   Amphora service. The Amphora service extracts the JWT from the incoming
   request and makes the encoded end user information available to the access
   control logic of the respective service ([non-goal](#non-goals) of this
   CSEP).

### Notes/Constraints/Caveats

- The Ory helm charts require Kubernetes 1.18+.

### Risks and Mitigations

None

## Design Details

### Deployment

Kratos and Hydra will be deployed via helm using the respective
[helm charts][ory-helm-charts] provided by the Ory community. Both have to be
configured for integration. There is no official guide available for that yet
(see [here][ory-kratos-hydra-integration-guide]) but a
[high-level description][ory-kratos-hydra-integration-steps] of the required
configuration is available.

The database connection details have to be configured to use the shared Postgres
database deployed as part of the SDK stack.

All of this will be implemented in the [Carbyne Stack SDK][cs-sdk].

### Services

As end user authentication is handled by Istio, no changes in the service
implementations are required. This will change when authorization is to be
implemented ([non-goal](#non-goals) of this CSEP) on top of the functionality
described in this CSEP.

### Service Provider Identity

The service provider is a privileged user in the system allowed to perform user
management operations via the Kratos Admin API. As part of the SDK deployment
the respective Kratos identity has to be created. This can be implemented as a
separate `helm.d` stage that uses a Kubernetes job that leverages the Kratos
Admin API to create the identity. Note that the cluster internal admin API
endpoint is to be used here.

### Exposing Endpoints

Existing Istio gateways, virtual services, and destination rules have to be
updated to enable end-user authentication for Amphora and Ephemeral. The basics
of how to do this are described [here][istio-end-user-authenticaion].

Istio virtual services and destination rules are created for the Kratos and
Hydra public APIs. Host names are set according to the values specified in the
helm charts. URLs are prefixed with `/iam`. Note that this probably has to be
reflected also in the customization of the Ory helm charts.

The Kratos Admin API (everything under `/admin`) is publicly exposed under
`/iam/admin` but Istio is configured to require specific `iss` and `sub` values
that represent the service provider identity (see [here][istio-auth-policy] for
per-path token requirements and point 4 [here][istio-jwt] for request principal
specification).

### Clients

Clients need to support attaching the ID tokens as a bearer token header to
requests. The current state of implementation is as follows:

- Amphora provides the required [basic functionality][amphora-bearer] already.
- Most functionality of Castor shouldn't be exposed publicly in the future
  anymore as tuple generation will be handled by Klyshko. Telemetry data should
  be exposed via a monitoring system (e.g., Prometheus) in the future. Hence,
  there is no need for implementing functionality in the Castor client.
- Ephemeral implements the required [basic functionality][ephemeral-bearer].
- Klyshko doesn't have an API yet.

### User Login and Consent

The CLI launches a browser to facilitate the OAuth2 Authentication Code Flow.
The user performs the login and gives consent via the browser. There is a
[reference implementation][hydra-ui] available that can be used. Deployment via
helm is described [here][hydra-ui-helm-deployment]. As we use OAuth2 in a
setting that doesn't involve a third party, the consent _should_ be granted
automatically, i.e., no explicit user consent via a dedicated consent view is
required.

### OAuth2 Client Setup

OAuth2 requires a client to be set up. This could be done using the Hydra Admin
API. However, there is a more K8s-native way of doing this by using
[Hydra Maester][hydra-maester] and the `oauth2clients.hydra.ory.sh/v1alpha1`
CRD. A respective resource must be created in the Carbyne Stack SDK stack for
the [CLI](#cli). The CLI must be configured by the user to use the respective
values from the resource, i.e., client identifier (`metadata > name`) and
redirect URIs (`spec > redirectUris`).

### CLI

The CLI implements the following functionality already:

- Support for configuring OAuth2 client identifier and callback URL (see
  [here][cli-config]). Reasonable defaults (derived from the VCP base URLs) must
  be provided.
- Storage of tokens (access and refresh token) in a dedicated file (see
  [here][cli-token-store]).
- Login command that performs the OAuth2 Authorization Code Flow for each VCP
  (see [here][cli-login-command]).

The provided functionality seems to be sufficient but has to be verified to work
with Hydra.

## Alternatives

- _Keycloak.X_ as a Java-based solution is not as lightweight as Ory. Using
  Keycloak.X instead of the Ory services shouldn't be a big deal, though, as
  most of the changes required to implement this CSEP are either client-side or
  SDK-related.

## Infrastructure Needed

Ory Kratos and Hydra are rather lightweight services. The docker images are less
than 20 MB each. For production deployment (of course depends on actual load
characteristics) the Ory community mentions 1 GB of RAM required for each. The
resource requests and limits for the SDK can be set probably much more
aggressively.

[amphora-bearer]: https://github.com/carbynestack/amphora/blob/9247f99bd12622037a2af891e25c218d48eaa2a6/amphora-java-client/src/main/java/io/carbynestack/amphora/client/DefaultAmphoraClientBuilder.java#L54
[cli-config]: https://github.com/carbynestack/cli/blob/master/src/main/java/io/carbynestack/cli/configuration/VcpConfiguration.java
[cli-login-command]: https://github.com/carbynestack/cli/blob/master/src/main/java/io/carbynestack/cli/login/LoginCommand.java
[cli-token-store]: https://github.com/carbynestack/cli/blob/master/src/main/java/io/carbynestack/cli/login/VcpTokenStore.java
[cs-sdk]: https://github.com/carbynestack/carbynestack
[ephemeral-bearer]: https://github.com/carbynestack/ephemeral/blob/efc7f8d6968fd1dff52c6cc7bcb329913bcb55ac/ephemeral-java-client/src/main/java/io/carbynestack/ephemeral/client/EphemeralClient.java#L79
[hydra-maester]: https://github.com/ory/k8s/blob/master/docs/helm/hydra-maester.md
[hydra-ui]: https://github.com/ory/hydra-login-consent-node
[hydra-ui-helm-deployment]: http://k8s.ory.sh/helm/hydra.html
[istio-auth-policy]: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/#require-valid-tokens-per-path
[istio-end-user-authenticaion]: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/#end-user-authentication
[istio-jwt]: https://istio.io/latest/docs/tasks/security/authorization/authz-jwt/#allow-requests-with-valid-jwt-and-list-typed-claims
[istio-user-authentication]: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/#end-user-authentication
[ory-helm-charts]: http://k8s.ory.sh/helm/
[ory-hydra]: https://www.ory.sh/hydra/
[ory-identities]: https://www.ory.sh/docs/kratos/manage-identities/overview
[ory-kratos]: https://www.ory.sh/kratos/
[ory-kratos-hydra-integration-guide]: https://github.com/ory/kratos/issues/273#issuecomment-1316676348
[ory-kratos-hydra-integration-steps]: https://github.com/ory/kratos/issues/273#issuecomment-1305388654
