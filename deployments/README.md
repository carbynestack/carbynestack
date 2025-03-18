# Carbyne Stack IaC (Infrastructure as Code)

CarbyneStack has adopted Infrastructure as Code (IaC) as a core principle. IaC
is the process of managing and provisioning infrastructure through code instead
of manually deploying resources via kubectl, helm, etc. This allows for the
infrastructure to be versioned, tested, and deployed in a repeatable manner.

> **Warning** \
> The IaC code in this repository is using outdated versions of
> the Carbyne Stack components. The code is not maintained and should be used
> for reference only. \
> For the latest version of the Carbyne Stack, please
> refer to the manual deployment as described by the getting started guide on
> the
> [Carbyne Stack website](https://carbynestack.io/documentation/getting-started/deployment/manual/).

## Prerequisites

Before you begin, ensure you have met the following requirements:

- [Node.js](https://nodejs.org/en/download) v18.17.1
- [Terraform CLI](https://developer.hashicorp.com/terraform/downloads) v1.5.5
- [CDKTF CLI](https://developer.hashicorp.com/terraform/tutorials/cdktf/cdktf-install)
  v0.18.0

To deploy it locally:

- [Docker](https://docs.docker.com/engine/install/ubuntu/) v23.0.1
- [Kind](https://kind.sigs.k8s.io/) v0.17.0
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/)
  v1.26.1
- [Helm](https://helm.sh/docs/intro/install/) v3.11.1

## Setup

1. Run `npm install` in the `./deployments` folder

## Deploy

In the `./deployments` folder:

1. Run `cdktf get` to generate provider bindings and import necessary modules.
1. Deploy the stack using `cdktf deploy <provider-id>`.

Supported providers include:

- `local-kind`: Local deployment using Kind (Kubernetes in Docker).

## Destroy and Clean Up

If you no longer need the stack, you can tear it down via run the following:

```bash
cdktf destroy
```

Alternatively, you can use:

```bash
kind delete clusters cs-1 cs-2
```

And delete the ckdtf state files (like `terraform.local-kind.tfstate`)

## 3rd Party Licenses

For information on how license obligations for 3rd party OSS dependencies are
fulfilled see the
[README](https://github.com/carbynestack/carbynestack/README.md) file of the
Carbyne Stack repository.

## Contributing

Please see the Carbyne Stack
[Contributor's Guide](https://github.com/carbynestack/carbynestack/blob/master/CONTRIBUTING.md).
