/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";
import * as kubernetes from "@cdktf/provider-kubernetes";

export interface EtcdConfig {
  helmProvider: cdktf.TerraformProvider;
  kubernetesProvider: cdktf.TerraformProvider;
}

export class Etcd extends Construct {
  public release: cdktf.TerraformResource;
  public etcdIp: string;

  constructor(scope: Construct, name: string, config: EtcdConfig) {
    super(scope, name);

    this.release = new helm.release.Release(this, `etcd`, {
      wait: true,
      waitForJobs: true,
      provider: config.helmProvider,
      timeout: 600,
      name: "cs-etcd",
      chart: "etcd",
      repository: "https://charts.bitnami.com/bitnami/",
      version: "8.3.1",
      set: [
        { name: "auth.rbac.create", value: "false" },
        { name: "service.type", value: "LoadBalancer" },
      ],
    });

    const etcdService =
      new kubernetes.dataKubernetesService.DataKubernetesService(
        this,
        `etcd-service`,
        {
          provider: config.kubernetesProvider,
          dependsOn: [this.release],
          metadata: {
            name: "cs-etcd",
          },
        },
      );

    this.etcdIp = new cdktf.TerraformOutput(this, `etcd-ingress-master-ip`, {
      value: etcdService.status.get(0).loadBalancer.get(0).ingress.get(0).ip,
    }).value;
  }
}
