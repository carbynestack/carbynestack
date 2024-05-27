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
import * as kind from "../.gen/providers/kind";
import * as http from "@cdktf/provider-http";
import { CarbyneStack } from "../constructs/carbyne-stack";
import { VCP } from "../constructs/vcp";

export default class LocalKindStack extends cdktf.TerraformStack {
  // eslint-disable-next-line complexity
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const kindProvider = new kind.provider.KindProvider(this, "kind-provider");

    const dependables: cdktf.ITerraformDependable[] = [];

    for (let i = 1; i <= 2; i++) {
      const kindCluster = new kind.cluster.Cluster(this, `kind-${i}`, {
        provider: kindProvider,
        name: `cs-${i}`,
        waitForReady: true,
      });

      const kubernetesProvider = new kubernetes.provider.KubernetesProvider(
        this,
        `provider-kubernetes-${i}`,
        {
          alias: `provider-kubernetes-${i}`,
          configPath: kindCluster.kubeconfigPath,
        },
      );

      const kubectlProvider = new kubectl.provider.KubectlProvider(
        this,
        `provider-kubectl-${i}`,
        {
          alias: `provider-kubectl-${i}`,
          configPath: kindCluster.kubeconfigPath,
        },
      );

      const helmProvider = new helm.provider.HelmProvider(
        this,
        `provider-helm-${i}`,
        {
          alias: `provider-helm-${i}`,
          kubernetes: {
            configPath: kindCluster.kubeconfigPath,
          },
        },
      );

      const httpProvider = new http.provider.HttpProvider(
        this,
        `provider-http-${i}`,
        {
          alias: `provider-http-${i}`,
        },
      );

      const vcp = new VCP(this, `vcp-${i}`, {
        lbSubnet: `172.18.${i}.255/25`,
        kubernetesProvider,
        kubectlProvider,
        helmProvider,
        httpProvider,
      });

      dependables.push(
        ...[
          kindCluster,
          vcp.metalLB.metalLB,
          vcp.knative.knativeOperator,
          vcp.knative.knativeServing,
          vcp.postgres,
          vcp.istio.istioIngressGatewayService,
        ],
      );

      // eslint-disable-next-line no-new
      new CarbyneStack(this, `cs-${i}`, {
        dependsOn: dependables,
        helmProvider,
        fqdn: vcp.istio.ingressIP,
        isMaster: i === 1,
        masterHost: "172.18.1.128.sslip.io",
        macKey:
          i === 1
            ? "-88222337191559387830816715872691188861"
            : "1113507028231509545156335486838233835",
        noSSLValidation: true,
        partnerFQDN:
          i === 1 ? "172.18.2.128.sslip.io" : "172.18.1.128.sslip.io",
        prime: "198766463529478683931867765928436695041",
        r: "141515903391459779531506841503331516415",
        rInv: "133854242216446749056083838363708373830",
        gfpMacKey:
          i === 1
            ? "-88222337191559387830816715872691188861"
            : "1113507028231509545156335486838233835",
        gf2nMacKey: i === 1 ? "0xb660b323e6" : "0x4ec9a0343c",
        gf2nBitLength: 40,
        gf2nStorageSize: 8,
        noJWTAuthn: true,
        jwtIssuer: "testing@secure.istio.io", // TODO: Change to actual iam issuer
        jwksUri:
          "https://raw.githubusercontent.com/istio/istio/release-1.22/security/tools/jwt/samples/jwks.json",
      });
    }
  }
}
