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
import * as http from "@cdktf/provider-http";
import { Istio } from "./istio";

export interface KnativeConfig {
  idPostfix?: string;
  istio: Istio;
  kubernetesProvider: cdktf.TerraformProvider;
  kubectlProvider: cdktf.TerraformProvider;
  httpProvider: cdktf.TerraformProvider;
}

export class Knative extends Construct {
  public knativeOperator: kubectl.manifest.Manifest;
  public knativeServing: kubectl.manifest.Manifest;

  constructor(scope: Construct, name: string, config: KnativeConfig) {
    super(scope, name);

    const knativeNamespace = new kubernetes.namespace.Namespace(
      this,
      `knative-namespace${config.idPostfix}`,
      {
        provider: config.kubernetesProvider,
        metadata: {
          name: "knative-serving",
        },
      },
    );

    const knativeOperatorYaml = new http.dataHttp.DataHttp(
      this,
      `knative-operator-yaml${config.idPostfix}`,
      {
        provider: config.httpProvider,
        url: "https://github.com/knative/operator/releases/download/knative-v1.10.2/operator.yaml",
      },
    );

    const knativeOperatorManifests =
      new kubectl.dataKubectlFileDocuments.DataKubectlFileDocuments(
        this,
        `knative-operators${config.idPostfix}`,
        {
          provider: config.kubectlProvider,
          content: knativeOperatorYaml.body,
        },
      );

    const knativeOperatorManifestsIter = cdktf.TerraformIterator.fromList(
      knativeOperatorManifests.documents,
    );

    this.knativeOperator = new kubectl.manifest.Manifest(
      this,
      `knative-operator${config.idPostfix}`,
      {
        dependsOn: [config.istio.istioIngressGatewayService],
        provider: config.kubectlProvider,
        forEach: knativeOperatorManifestsIter,
        yamlBody: knativeOperatorManifestsIter.value,
        wait: true,
      },
    );

    this.knativeServing = new kubectl.manifest.Manifest(
      this,
      `knative-serving${config.idPostfix}`,
      {
        provider: config.kubectlProvider,
        validateSchema: true,
        dependsOn: [
          this.knativeOperator,
          config.istio.istioIngressGatewayService,
        ],
        yamlBody: `
                apiVersion: operator.knative.dev/v1beta1
                kind: KnativeServing
                metadata:
                  name: knative-serving
                  namespace: ${knativeNamespace.metadata.name}
                spec:
                  version: 1.8.2
                  manifests:
                    - URL: https://github.com/carbynestack/serving/releases/download/v1.8.2-multiport-patch/serving-crds.yaml
                    - URL: https://github.com/carbynestack/serving/releases/download/v1.8.2-multiport-patch/serving-core.yaml
                    - URL: https://github.com/knative/net-istio/releases/download/v1.8.2/release.yaml
                    - URL: https://github.com/knative/net-certmanager/releases/download/v1.8.2/release.yaml
                  config:
                     domain:
                        ${config.istio.ingressIP}.sslip.io: ""
                     defaults:
                        max-revision-timeout-seconds: "36000"
            `,
      },
    );
  }
}
