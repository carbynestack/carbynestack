/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as kubernetes from "@cdktf/provider-kubernetes";
import * as kubectl from "../../.gen/providers/kubectl";
import * as helm from "@cdktf/provider-helm";
import * as kind from "../../.gen/providers/kind";
import { MetalLB } from "../backing-services/metal-lb";
import { Istio } from "../backing-services/istio";

export interface KindConfig {
  lbSubnet: string;
}

export class KindPlatform extends Construct {
  public kubernetesProvider: kubernetes.provider.KubernetesProvider;
  public kubectlProvider: kubectl.provider.KubectlProvider;
  public helmProvider: helm.provider.HelmProvider;
  public ingressIP: string;
  public kindCluster: kind.cluster.Cluster;

  constructor(scope: Construct, name: string, config: KindConfig) {
    super(scope, name);

    const kindProvider = new kind.provider.KindProvider(
      this,
      `kind-provider-${name}`,
      {
        alias: `kind-provider-${name}`,
      },
    );

    this.kindCluster = new kind.cluster.Cluster(this, `kind-${name}`, {
      provider: kindProvider,
      name: `cs-${name}`,
      waitForReady: true,
    });

    this.kubernetesProvider = new kubernetes.provider.KubernetesProvider(
      this,
      `provider-kubernetes-${name}`,
      {
        alias: `provider-kubernetes-${name}`,
        configPath: this.kindCluster.kubeconfigPath,
      },
    );

    this.kubectlProvider = new kubectl.provider.KubectlProvider(
      this,
      `provider-kubectl-${name}`,
      {
        alias: `provider-kubectl-${name}`,
        configPath: this.kindCluster.kubeconfigPath,
      },
    );

    this.helmProvider = new helm.provider.HelmProvider(
      this,
      `provider-helm-${name}`,
      {
        alias: `provider-helm-${name}`,
        kubernetes: {
          configPath: this.kindCluster.kubeconfigPath,
        },
      },
    );

    // metallb
    const metalLB = new MetalLB(this, `metal-lb`, {
      idPostfix: ``,
      subnet: config.lbSubnet,
      kubernetesProvider: this.kubernetesProvider,
      kubectlProvider: this.kubectlProvider,
      helmProvider: this.helmProvider,
    });

    // istio
    const istio = new Istio(this, `istio`, {
      dependsOn: [metalLB.metalLB, metalLB.ipAddressPool],
      kubernetesProvider: this.kubernetesProvider,
      helmProvider: this.helmProvider,
    });

    this.ingressIP = istio.ingressIP;
  }
}
