/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import { CarbyneStack } from "../constructs/carbyne-stack";
import { KindPlatform } from "../constructs/platforms/kind-platform";

export default class LocalKindCluster extends cdktf.TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const kindPlatforms: KindPlatform[] = [];
    for (let i = 1; i <= 2; i++) {
      kindPlatforms.push(
        new KindPlatform(this, `kind-${i}`, {
          lbSubnet: `172.18.${i}.255/25`,
        }),
      );
    }

    for (let i = 1; i <= kindPlatforms.length; i++) {
      new CarbyneStack(this, `cs-${i}`, {
        dependsOn: [],
        helmProvider: kindPlatforms[i - 1].helmProvider,
        kubernetesProvider: kindPlatforms[i - 1].kubernetesProvider,
        kubectlProvider: kindPlatforms[i - 1].kubectlProvider,
        fqdn: kindPlatforms[i - 1].ingressIP,
        isMaster: i === 1,
        masterHost: "172.18.1.128.sslip.io",
        macKey:
          i === 1
            ? "-88222337191559387830816715872691188861"
            : "1113507028231509545156335486838233835",
        noSSLValidation: true,
        partnerFQDN: `${kindPlatforms[i % 2].ingressIP}.sslip.io`,
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
        jwtIssuer: `http://${
          kindPlatforms[i % 2].ingressIP
        }.sslip.io/iam/oauth`,
        jwksUri: `http://${
          kindPlatforms[i % 2].ingressIP
        }.sslip.io/iam/oauth.well-known/jwks.json`,
      });
    }
  }
}
