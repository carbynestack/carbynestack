/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as kubernetes from "@cdktf/provider-kubernetes";
import * as kubectl from "../../.gen/providers/kubectl";
import * as http from "@cdktf/provider-http";

export interface KnativeConfig {
  ingressIP: string;
  kubernetesProvider: cdktf.TerraformProvider;
  kubectlProvider: cdktf.TerraformProvider;
  tlsEnabled: boolean;
  tlsSecret: string;
}

export class Knative extends Construct {
  public knativeOperator: cdktf.TerraformResource;
  public knativeServing: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: KnativeConfig) {
    super(scope, name);

    const httpProvider = new http.provider.HttpProvider(
      this,
      `provider-http-${name}`,
      {
        alias: `provider-http-${name}`,
      },
    );

    const knativeNamespace = new kubernetes.namespace.Namespace(
      this,
      `knative-namespace-${name}`,
      {
        provider: config.kubernetesProvider,
        metadata: {
          name: "knative-serving",
        },
      },
    );

    const knativeOperatorYaml = new http.dataHttp.DataHttp(
      this,
      `knative-operator-yaml-${name}`,
      {
        provider: httpProvider,
        url: "https://github.com/knative/operator/releases/download/knative-v1.10.2/operator.yaml",
      },
    );

    const knativeOperatorManifests =
      new kubectl.dataKubectlFileDocuments.DataKubectlFileDocuments(
        this,
        `knative-operators-${name}`,
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
      `knative-operator-${name}`,
      {
        provider: config.kubectlProvider,
        forEach: knativeOperatorManifestsIter,
        yamlBody: knativeOperatorManifestsIter.value,
      },
    );

    this.knativeServing = new kubectl.manifest.Manifest(
      this,
      `knative-serving-${name}`,
      {
        provider: config.kubectlProvider,
        validateSchema: true,
        dependsOn: [this.knativeOperator],
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
                    ${config.ingressIP}.sslip.io: ""
                 defaults:
                    max-revision-timeout-seconds: "36000"
        `,
      },
    );
    // TODO: Decide how to proceed with Knative ingress gateway (either patch or use default istio ingressgateway)
    // if (config.tlsEnabled) {
    //   const patchKnativeIngressGateway = new kubectl.KubectlProvider(this, `patch-knative-ingress-gateway-${name}`, {
    //     provider: config.kubectlProvider,
    //     command: `
    //       kubectl patch gateway knative-ingress-gateway --namespace knative-serving --type=json -p='[{"op": "add", "path": "/spec/servers/-", "value": {"hosts": ["*"], "port": {"name": "https", "number": 443, "protocol": "HTTPS"}, "tls": {"mode": "SIMPLE", "credentialName": "${config.tlsSecret}"}}}]'
    //     `,
    //     dependsOn: [this.knativeServing],
    //   });
    // }
  }
}
