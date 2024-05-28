/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdktf from "cdktf";
import * as azurerm from "@cdktf/provider-azurerm";
import { Construct } from "constructs";
import { AzurePlatform } from "../constructs/platforms/azure-platform";
import { CarbyneStack } from "../constructs/carbyne-stack";

export default class AzureCluster extends cdktf.TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new azurerm.provider.AzurermProvider(this, "AzureRm", {
      features: {
        resourceGroup: {
          preventDeletionIfContainsResources: false,
        },
      },
    });
    // create a shared azure resource group for all the platforms
    const azureResourceGroup = new azurerm.resourceGroup.ResourceGroup(
      this,
      "cs-rg",
      {
        name: "cs-rg",
        location: "northeurope",
      },
    );

    const azurePlatforms: AzurePlatform[] = [];
    for (let i = 1; i <= 2; i++) {
      azurePlatforms.push(
        new AzurePlatform(this, `az-${i}`, {
          resourceGroup: azureResourceGroup,
          location: azureResourceGroup.location,
          virtualNetworkAddressSpace: [`10.${i}.0.0/16`],
          subnetAddressPrefixes: [`10.${i}.1.0/24`],
        }),
      );
    }

    let etcdIP: string | undefined;
    for (let i = 1; i <= azurePlatforms.length; i++) {
      const cs = new CarbyneStack(this, `cs-${i}`, {
        dependsOn: [],
        helmProvider: azurePlatforms[i - 1].helmProvider,
        kubernetesProvider: azurePlatforms[i - 1].kubernetesProvider,
        kubectlProvider: azurePlatforms[i - 1].kubectlProvider,
        fqdn: azurePlatforms[i - 1].ingressIp,
        isMaster: i === 1,
        masterHost: `${azurePlatforms[0].ingressIp}.sslip.io`,
        etcdIP: etcdIP,
        macKey:
          i === 1
            ? "-88222337191559387830816715872691188861"
            : "1113507028231509545156335486838233835",
        noSSLValidation: true,
        partnerFQDN: `${azurePlatforms[i % 2].ingressIp}.sslip.io`,
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
      });

      if (i == 1) {
        etcdIP = cs.etcdIp;
      }
    }
  }
}
