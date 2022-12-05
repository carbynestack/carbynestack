# CSEP-014: IaC based development VC deployment

<!-- TOC -->

- [Summary](#summary)
- [Motivation](#motivation)
  - [Goals](#goals)
  - [Non-Goals](#non-goals)
- [Proposal](#proposal)
  - [Risks and Mitigations](#risks-and-mitigations)
  - [User Stories](#user-stories)
    - [Virtual Cloud Deployment](#virtual-cloud-deployment)
- [Design Details](#design-details)
- [Alternatives](#alternatives)

<!-- TOC -->

## Summary

As setting up a Carbyne Stack VC with multiple VCPs is a cumbersome task,
Infrastructure as Code (IaC) could highly simplify the process, reduce the
number of manual steps required, and therefore also lower the entry barrier for
getting hands on Carbyne Stack.

## Motivation

Setting up a Carbyne Stack test and development VC is a cumbersome and error
prone task, even when following the official guides on
[carbynestack.io](http://carbvynestack.io). Using Infrastructure as Code could
simplify the process of deploying and configuring VCPs by automating the process
and minimizing the number of manual, error-prone steps required.

### Goals

The primary goal of this enhancement proposal is to have IaC configurations
available which allows to easily setup and configure a user given number of VCPs
to provide a test and development VC. As described by the
[CS getting started](https://carbynestack.io/getting-started/) guides for
[prerequisites](https://carbynestack.io/getting-started/prerequisites/) and
[platform setup](https://carbynestack.io/getting-started/platform-setup/), the
development VC should be based on local Kind clusters. Nevertheless, by
separating the setup configurations for deploying a VCP's cluster and the actual
deployment of the Carbyne Stack foundation services (as described by
[Stack Deployment](https://carbynestack.io/getting-started/deployment/)), using
IaC should allow to re-use the foundation service deployment configuration to
support simple VC cloud deployment in the future.

\<tl/dr>

- IaC based and automated deployment and configuration of a user defined number
  of local Kind clusters to serve as individual VCPs as described by the
  [platform setup](https://carbynestack.io/getting-started/platform-setup/)
  guide.
- IaC based and automated deployment and configuration of the Carbyne Stack
  foundations services and their dependencies as described by the
  [Stack Deployment](https://carbynestack.io/getting-started/deployment/) guide.
- A single script or a compressed and simplified guide for using IaC to set up a
  local Carbyne Stack VC with a minimum of possible errors.

### Non-Goals

As an initial step, the IaC configurations should provide a local Carbyne Stack
VC for easy test and development. It is not intended to provide support for
actual cloud deployment.

## Proposal

This CSEP proposes to provide IaC configurations for the
[CS getting started](https://carbynestack.io/getting-started/) guides for
[platform setup](https://carbynestack.io/getting-started/platform-setup/) and
[Stack Deployment](https://carbynestack.io/getting-started/deployment/) using
[CDK for Terraform (CDKTF)](https://developer.hashicorp.com/terraform/cdktf/).
CDKTF allows to programmatically describe an infrastructure setup using well
established programming languages such as Typescript, Java, C# or Go.
Underneath, instructions are translated into
[Terraform](https://developer.hashicorp.com/terraform) configurations without
any limitations in functionality.

### User Stories

The user story described below make use of the following role:

- A **Service Provider** is the party that offers a service on a Carbyne Stack
  virtual cloud by deploying and invoking MPC functionality.
- A **CS Developer** is a party that participates in implementing the Carbyne
  Stack foundation services.

#### Virtual Cloud Deployment

A service provider or CS developer wants to deploy a Carbyne Stack Virtual Cloud
(VC) consisting of three Virtual Cloud Providers (VCPs). To achieve this, they
deploy a Carbyne Stack VC using CDKTF configuration the desired number VCPs as a
parameter as follows:

```bash
git clone https://github.com/carbynestack/carbynestack.git
cd carbynestack
TF_VAR_numberOfVcps=3 cdktf deploy
```

Once the VC is deployed, CDKTF will print the VC configuration which can then be
written to the CS CLI configuration file as it is.

### Risks and Mitigations

n/a

## Design Details

n/a

## Alternatives

As an alternative to CDKTF to be used as IaC tool, there are plenty of other
tools available (see
[Top 10 IaC Tools by 2022](https://spectralops.io/blog/top-10-infrastructure-as-code-iac-tools-to-know-in-2022/)
for an overview on IaC and an excerpt on available tools). So, as an
alternative, [Pulumi](https://www.pulumi.com/), a relatively new IaC tool
following the programmatic paradigm and said to be focusing on platform
engineers, can be used.
