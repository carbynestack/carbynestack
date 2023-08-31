/*
 * Copyright (c) 2023 - for information on the respective copyright owner
 * see the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as kubernetes from "@cdktf/provider-kubernetes";
import * as kubectl from "../.gen/providers/kubectl";
import * as helm from "@cdktf/provider-helm";

export interface MetalLBConfig {
  idPostfix?: string;
  version?: string;
  subnet?: string;
  kubernetesProvider?: cdktf.TerraformProvider;
  helmProvider?: cdktf.TerraformProvider;
  kubectlProvider?: cdktf.TerraformProvider;
}

export class MetalLB extends Construct {
  public ipAddressPool: kubectl.manifest.Manifest;
  public advertisement: kubectl.manifest.Manifest;
  public metalLB: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: MetalLBConfig) {
    super(scope, name);

    const metalLBNamespace = new kubernetes.namespace.Namespace(
      this,
      `metallb-system${config.idPostfix}`,
      {
        provider: config.kubernetesProvider,
        metadata: {
          name: "metallb-system",
        },
      },
    );

    this.metalLB = new helm.release.Release(
      this,
      `metallb${config.idPostfix}`,
      {
        dependsOn: [metalLBNamespace],
        provider: config.helmProvider,
        name: "metallb",
        chart: "metallb",
        version: config.version ?? "0.13.9",
        namespace: metalLBNamespace.metadata.name,
        repository: "https://metallb.github.io/metallb",
        set: [
          { name: "apiVersion", value: "v1" },
          { name: "kind", value: "Namespace" },
          {
            name: "metadata.labels.pod-security.kubernetes.io/audit",
            value: "privileged",
          },
          {
            name: "metadata.labels.pod-security.kubernetes.io/enforce",
            value: "privileged",
          },
          {
            name: "metadata.labels.pod-security.kubernetes.io/warn",
            value: "privileged",
          },
          { name: "metadata.name", value: "metallb-system" },
        ],
        wait: true,
      },
    );

    this.ipAddressPool = new kubectl.manifest.Manifest(
      this,
      `metallb-ipaddresspool${config.idPostfix}`,
      {
        provider: config.kubectlProvider,
        dependsOn: [this.metalLB],
        yamlBody: `
          apiVersion: metallb.io/v1beta1
          kind: IPAddressPool
          metadata:
            name: default
            namespace: metallb-system
          spec:
            addresses:
              - ${config.subnet ?? "172.18.1.255/25"}
        `,
        wait: true,
      },
    );

    this.advertisement = new kubectl.manifest.Manifest(
      this,
      `metallb-l2advertisement${config.idPostfix}`,
      {
        provider: config.kubectlProvider,
        dependsOn: [this.metalLB],
        yamlBody: `
                apiVersion: metallb.io/v1beta1
                kind: L2Advertisement
                metadata:
                  name: empty
                  namespace: metallb-system
            `,
      },
    );
  }
}
