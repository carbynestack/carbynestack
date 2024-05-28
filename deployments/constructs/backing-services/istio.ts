/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as kubernetes from "@cdktf/provider-kubernetes";
import * as helm from "@cdktf/provider-helm";

export interface IstioConfig {
  dependsOn: cdktf.ITerraformDependable[];
  helmProvider?: cdktf.TerraformProvider;
  kubernetesProvider?: cdktf.TerraformProvider;
  ingressGatewayValues?: string[];
}

export class Istio extends Construct {
  public ingressIP: string;
  public istioIngressGatewayService: kubernetes.dataKubernetesService.DataKubernetesService;

  constructor(scope: Construct, name: string, config: IstioConfig) {
    super(scope, name);

    const istioNamespace = new kubernetes.namespace.Namespace(
      this,
      `istio-system-${name}`,
      {
        provider: config.kubernetesProvider,
        metadata: {
          name: "istio-system",
        },
      },
    );

    const istioBase = new helm.release.Release(this, `istio-base-${name}`, {
      dependsOn: [...config.dependsOn],
      provider: config.helmProvider,
      name: "istio-base",
      chart: "base",
      version: "1.22.0",
      namespace: istioNamespace.metadata.name,
      repository: "https://istio-release.storage.googleapis.com/charts",
    });

    // istio control plane - https://istio.io/latest/blog/2020/istiod/
    const istioD = new helm.release.Release(this, `istiod-${name}`, {
      dependsOn: [...config.dependsOn, istioBase],
      provider: config.helmProvider,
      name: "istiod",
      chart: "istiod",
      version: "1.22.0",
      namespace: istioNamespace.metadata.name,
      repository: "https://istio-release.storage.googleapis.com/charts",
    });

    // istio ingress

    const istioIngressGatewayPorts = [
      { name: "status-port", port: "15021", targetPort: "15021" },
      { name: "http2", port: "80", targetPort: "8080" },
      { name: "https", port: "443", targetPort: "8443" },
      { name: "tcp", port: "31400", targetPort: "31400" },
      { name: "tls", port: "15443", targetPort: "15443" },
      { name: "ephemeral-mpc-engine-port-0", port: "30000" },
      { name: "ephemeral-mpc-engine-port-1", port: "30001" },
      { name: "ephemeral-mpc-engine-port-2", port: "30002" },
      { name: "ephemeral-mpc-engine-port-3", port: "30003" },
      { name: "ephemeral-mpc-engine-port-4", port: "30004" },
    ];

    const istioIngressGateway = new helm.release.Release(
      this,
      `istio-ingress-gateway-${name}`,
      {
        provider: config.helmProvider,
        name: "istio-ingressgateway",
        chart: "gateway",
        version: "1.22.0",
        namespace: istioNamespace.metadata.name,
        dependsOn: [...config.dependsOn, istioBase, istioD],
        repository: "https://istio-release.storage.googleapis.com/charts",
        values: config.ingressGatewayValues,
        set: istioIngressGatewayPorts.flatMap((port, index) => [
          { name: `service.ports[${index}].name`, value: port.name },
          { name: `service.ports[${index}].port`, value: port.port },
          ...(port.targetPort !== undefined
            ? [
                {
                  name: `service.ports[${index}].targetPort`,
                  value: port.targetPort,
                },
              ]
            : []),
        ]),
      },
    );

    this.istioIngressGatewayService =
      new kubernetes.dataKubernetesService.DataKubernetesService(
        this,
        `istio-ingressgateway-service-${name}`,
        {
          provider: config.kubernetesProvider,
          dependsOn: [...config.dependsOn, istioIngressGateway],
          metadata: {
            name: "istio-ingressgateway",
            namespace: istioNamespace.metadata.name,
          },
        },
      );

    this.ingressIP = new cdktf.TerraformOutput(this, `ingress-ip-${name}`, {
      value: this.istioIngressGatewayService.status
        .get(0)
        .loadBalancer.get(0)
        .ingress.get(0).ip,
    }).value;
  }
}
