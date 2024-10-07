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
import * as path from "path";
import * as fs from "fs";

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

    const tlsEnabled = true; // Set to false to disable TLS

    const certsDir = path.resolve(__dirname, "../certs");
    const stackNamePrefix = "cs";

    const createCertsResources: cdktf.TerraformResource[] = [];

    if (tlsEnabled) {
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir);
      }

      // Generate certs for each platform
      for (let i = 1; i <= kindPlatforms.length; i++) {
        const stackName = stackNamePrefix + "-" + i;
        const ip = kindPlatforms[i - 1].ingressIP;
        const fqdn = `${ip}.sslip.io`;

        const createCertsResource = new cdktf.TerraformResource(
          this,
          `create-certs-${i}`,
          {
            terraformResourceType: "null_resource",
            provisioners: [
              {
                type: "local-exec",
                command: `
                openssl req -x509 -newkey rsa:4096 -keyout ${certsDir}/${stackName}_key.pem -out ${certsDir}/${stackName}_cert.pem -days 365 -nodes -subj "/CN=${fqdn}" -addext "subjectAltName=DNS:${fqdn},IP:${ip}"
              `,
              },
            ],
            dependsOn: [kindPlatforms[i - 1].kindCluster],
          },
        );

        createCertsResources.push(createCertsResource);
      }
    }

    let previousResource: cdktf.TerraformResource | null = null;

    for (let i = 1; i <= kindPlatforms.length; i++) {
      const stackName = stackNamePrefix + "-" + i;
      const tlsSecretName = `tls-secret-generic-${stackName}`;

      if (tlsEnabled) {
        // Create Kubernetes secrets based on the generated certs

        // Construct the cacerts argument
        let cacertsArgs = "";
        for (let j = 1; j <= kindPlatforms.length; j++) {
          if (i !== j) {
            cacertsArgs += `--from-file=cacert${j}=${certsDir}/${stackNamePrefix}-${j}_cert.pem `;
          }
        }

        const createSecretResource: cdktf.TerraformResource =
          new cdktf.TerraformResource(this, `create-secrets-${i}`, {
            terraformResourceType: "null_resource",
            provisioners: [
              {
                type: "local-exec",
                command: `
                kubectl config use-context kind-cs-kind-${i}
                kubectl create secret generic ${tlsSecretName} -n istio-system --from-file=tls.key=${certsDir}/${stackName}_key.pem --from-file=tls.crt=${certsDir}/${stackName}_cert.pem ${cacertsArgs}
                kubectl get secret ${tlsSecretName} -n istio-system -o yaml | sed 's/namespace: istio-system/namespace: default/' | kubectl apply -n default -f -
              `,
              },
            ],
            dependsOn: [
              kindPlatforms[i - 1].kindCluster,
              ...createCertsResources,
              ...(previousResource ? [previousResource] : []),
            ],
          });

        previousResource = createSecretResource;
      }

      new CarbyneStack(this, `${stackNamePrefix}-${i}`, {
        dependsOn: [kindPlatforms[i - 1].kindCluster],
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
        tlsEnabled: tlsEnabled,
        tlsSecret: tlsSecretName,
      });
    }
  }
}
