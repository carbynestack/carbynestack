/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as azurerm from "@cdktf/provider-azurerm";
import * as kubernetes from "@cdktf/provider-kubernetes";
import * as kubectl from "../../.gen/providers/kubectl";
import * as helm from "@cdktf/provider-helm";
import { Istio } from "../backing-services/istio";
import { Fn } from "cdktf";
import { Construct } from "constructs";

export interface AKSConfig {
  resourceGroup: string | azurerm.resourceGroup.ResourceGroup;
  virtualNetworkAddressSpace?: string[];
  subnetAddressPrefixes: string[];
  location: string;
  privateDnsZone?: azurerm.privateDnsZone.PrivateDnsZone;
  nodePool?: {
    nodeCount?: number;
    vmSize?: string;
  };
}

export class AzurePlatform extends Construct {
  public ingressIp: string;
  public kubernetesProvider: kubernetes.provider.KubernetesProvider;
  public kubectlProvider: kubectl.provider.KubectlProvider;
  public helmProvider: helm.provider.HelmProvider;
  public virtualNetwork: azurerm.virtualNetwork.VirtualNetwork;
  public resourceGroup: azurerm.resourceGroup.ResourceGroup;

  constructor(scope: Construct, name: string, config: AKSConfig) {
    super(scope, name);

    // if the resource group is a string, create a new resource group with the provided name, otherwise use the provided resource group
    if (typeof config.resourceGroup === "string") {
      this.resourceGroup = new azurerm.resourceGroup.ResourceGroup(
        this,
        `${name}-rg`,
        {
          name: config.resourceGroup,
          location: config.location,
        },
      );
    } else {
      this.resourceGroup = config.resourceGroup;
    }

    this.virtualNetwork = new azurerm.virtualNetwork.VirtualNetwork(
      this,
      `${name}-vnet`,
      {
        name: `${name}-vnet`,
        resourceGroupName: this.resourceGroup.name,
        location: this.resourceGroup.location,
        addressSpace: config.virtualNetworkAddressSpace!,
      },
    );

    // subnet
    const subnet = new azurerm.subnet.Subnet(this, `${name}-subnet`, {
      name: `${this.resourceGroup.name}-subnet`,
      resourceGroupName: this.resourceGroup.name,
      virtualNetworkName: this.virtualNetwork.name,
      addressPrefixes: config.subnetAddressPrefixes,
    });

    const kubernetesCluster = new azurerm.kubernetesCluster.KubernetesCluster(
      this,
      `${name}-aks`,
      {
        name: `${name}-aks`,
        location: config.location,
        resourceGroupName: this.resourceGroup.name,
        dnsPrefix: "dns",
        defaultNodePool: {
          name: "agentpool",
          nodeCount: config.nodePool?.nodeCount ?? 1,
          vmSize: config.nodePool?.vmSize ?? "Standard_D3_v2",
          vnetSubnetId: subnet.id,
        },
        servicePrincipal: {
          clientId: process.env.ARM_CLIENT_ID as string,
          clientSecret: process.env.ARM_CLIENT_SECRET as string,
        },
        privateDnsZoneId: config.privateDnsZone
          ? config.privateDnsZone.id
          : undefined,
        privateClusterEnabled: config.privateDnsZone !== undefined,
        privateClusterPublicFqdnEnabled: config.privateDnsZone === undefined,
      },
    );

    // create a kubernetes provider using the kubeconfig from the kubernetes cluster
    this.kubernetesProvider = new kubernetes.provider.KubernetesProvider(
      this,
      `provider-kubernetes-${name}`,
      {
        alias: `provider-kubernetes-${name}`,
        host: kubernetesCluster.kubeConfig.get(0).host,
        username: kubernetesCluster.kubeConfig.get(0).username,
        password: kubernetesCluster.kubeConfig.get(0).password,
        clientCertificate: Fn.base64decode(
          kubernetesCluster.kubeConfig.get(0).clientCertificate,
        ),
        clusterCaCertificate: Fn.base64decode(
          kubernetesCluster.kubeConfig.get(0).clusterCaCertificate,
        ),
        clientKey: Fn.base64decode(
          kubernetesCluster.kubeConfig.get(0).clientKey,
        ),
      },
    );

    this.kubectlProvider = new kubectl.provider.KubectlProvider(
      this,
      `provider-kubectl-${name}`,
      {
        alias: `provider-kubectl-${name}`,
        host: kubernetesCluster.kubeConfig.get(0).host,
        username: kubernetesCluster.kubeConfig.get(0).username,
        password: kubernetesCluster.kubeConfig.get(0).password,
        clientCertificate: Fn.base64decode(
          kubernetesCluster.kubeConfig.get(0).clientCertificate,
        ),
        clusterCaCertificate: Fn.base64decode(
          kubernetesCluster.kubeConfig.get(0).clusterCaCertificate,
        ),
        clientKey: Fn.base64decode(
          kubernetesCluster.kubeConfig.get(0).clientKey,
        ),
        loadConfigFile: false,
      },
    );

    this.helmProvider = new helm.provider.HelmProvider(
      this,
      `provider-helm-${name}`,
      {
        alias: `provider-helm-${name}`,
        kubernetes: {
          host: kubernetesCluster.kubeConfig.get(0).host,
          username: kubernetesCluster.kubeConfig.get(0).username,
          password: kubernetesCluster.kubeConfig.get(0).password,
          clientCertificate: Fn.base64decode(
            kubernetesCluster.kubeConfig.get(0).clientCertificate,
          ),
          clusterCaCertificate: Fn.base64decode(
            kubernetesCluster.kubeConfig.get(0).clusterCaCertificate,
          ),
          clientKey: Fn.base64decode(
            kubernetesCluster.kubeConfig.get(0).clientKey,
          ),
        },
      },
    );

    // istio
    const istio = new Istio(this, `istio`, {
      dependsOn: [kubernetesCluster],
      kubernetesProvider: this.kubernetesProvider,
      helmProvider: this.helmProvider,
      ingressGatewayValues: config.privateDnsZone
        ? [
            `
                service:
                    annotations:
                        service.beta.kubernetes.io/azure-load-balancer-internal: "true"
            `,
          ]
        : [],
    });

    this.ingressIp = istio.ingressIP;
  }
}
