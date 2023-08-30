/*
 * Copyright (c) 2023 - for information on the respective copyright owner
 * see the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import { MetalLB } from "./metal-lb";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";
import { Istio } from "./istio";
import { Knative } from "./knative";

export interface VCPConfig {
  idPostfix?: string;
  lbSubnet: string;
  kubernetesProvider: cdktf.TerraformProvider;
  kubectlProvider: cdktf.TerraformProvider;
  helmProvider: cdktf.TerraformProvider;
  httpProvider: cdktf.TerraformProvider;
}

export class VCP extends Construct {
  public metalLB: MetalLB;
  public istio: Istio;
  public knative: Knative;
  public postgres: helm.release.Release;

  constructor(scope: Construct, name: string, config: VCPConfig) {
    super(scope, name);

    // metallb

    this.metalLB = new MetalLB(this, `metal-lb-${config.idPostfix}`, {
      idPostfix: `-${config.idPostfix}`,
      subnet: config.lbSubnet,
      kubernetesProvider: config.kubernetesProvider,
      kubectlProvider: config.kubectlProvider,
      helmProvider: config.helmProvider,
    });

    // istio

    this.istio = new Istio(this, `istio-${config.idPostfix}`, {
      idPostfix: `-${config.idPostfix}`,
      dependsOn: [this.metalLB.metalLB, this.metalLB.ipAddressPool],
      kubernetesProvider: config.kubernetesProvider,
      helmProvider: config.helmProvider,
    });

    // knative operator

    this.knative = new Knative(this, `knative-${config.idPostfix}`, {
      idPostfix: `-${config.idPostfix}`,
      istio: this.istio,
      kubectlProvider: config.kubectlProvider,
      kubernetesProvider: config.kubernetesProvider,
      httpProvider: config.httpProvider,
    });

    // postgres operator

    this.postgres = new helm.release.Release(
      this,
      `postgres-operator-${config.idPostfix}`,
      {
        dependsOn: [this.metalLB.metalLB],
        provider: config.helmProvider,
        name: "postgres-operator",
        chart: "postgres-operator",
        repository:
          "https://opensource.zalando.com/postgres-operator/charts/postgres-operator",
        wait: true,
        waitForJobs: true,
      },
    );
  }
}
