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

export interface AzurePrivateClusterConfig {
  jumpHostResourceGroup: string;
  jumpHostVirtualNetworkName: string;
}

export default class AzurePrivateCluster extends cdktf.TerraformStack {
  constructor(scope: Construct, id: string, config: AzurePrivateClusterConfig) {
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

    // create a private dns zone for the resource group
    const privateDnsZone = new azurerm.privateDnsZone.PrivateDnsZone(
      this,
      "cs-dns",
      {
        name: `cs.private.${azureResourceGroup.location}.azmk8s.io`,
        resourceGroupName: azureResourceGroup.name,
        tags: { environment: "cs" },
      },
    );

    const azurePlatforms: AzurePlatform[] = [];
    for (let i = 1; i <= 2; i++) {
      azurePlatforms.push(
        new AzurePlatform(this, `az-${i}`, {
          resourceGroup: azureResourceGroup,
          location: azureResourceGroup.location,
          privateDnsZone: privateDnsZone,
          virtualNetworkAddressSpace: [`10.${i}.0.0/16`],
          subnetAddressPrefixes: [`10.${i}.1.0/24`],
        }),
      );
    }

    // configure the jump host virtual network (if provided)
    const jumpHostVnet =
      new azurerm.dataAzurermVirtualNetwork.DataAzurermVirtualNetwork(
        this,
        "jump-host-vnet",
        {
          name: config.jumpHostVirtualNetworkName,
          resourceGroupName: config.jumpHostResourceGroup,
        },
      );

    // create a private dns zone virtual network link for the jump host
    new azurerm.privateDnsZoneVirtualNetworkLink.PrivateDnsZoneVirtualNetworkLink(
      this,
      "cs-vm-vnet-cs-private-dns-zone-link",
      {
        name: "cs-vm-vnet-cs-private-dns-zone-link",
        resourceGroupName: azureResourceGroup.name,
        privateDnsZoneName: privateDnsZone!.name,
        virtualNetworkId: jumpHostVnet.id,
        registrationEnabled: true,
      },
    );

    // setup virtual network peering so the platforms can communicate (since they are each in their own virtual network)
    for (let i = 1; i <= azurePlatforms.length; i++) {
      new azurerm.virtualNetworkPeering.VirtualNetworkPeering(
        this,
        `vnet-peer-${i}`,
        {
          name: `vnet-peer-${i}`,
          resourceGroupName: azureResourceGroup.name,
          virtualNetworkName: azurePlatforms[i - 1].virtualNetwork.name,
          remoteVirtualNetworkId: azurePlatforms[i % 2].virtualNetwork.id,
        },
      );

      // setup virtual network peering so the jump host can communicate with the platforms and vice versa
      new azurerm.virtualNetworkPeering.VirtualNetworkPeering(
        this,
        `vnet-peer-${i}-from-jump-host`,
        {
          name: `vnet-peer-${i}-from-jump-host`,
          resourceGroupName: jumpHostVnet.resourceGroupName,
          virtualNetworkName: jumpHostVnet.name,
          remoteVirtualNetworkId: azurePlatforms[i - 1].virtualNetwork.id,
        },
      );

      new azurerm.virtualNetworkPeering.VirtualNetworkPeering(
        this,
        `vnet-peer-${i}-to-jump-host`,
        {
          name: `vnet-peer-${i}-to-jump-host`,
          resourceGroupName: azureResourceGroup.name,
          virtualNetworkName: azurePlatforms[i - 1].virtualNetwork.name,
          remoteVirtualNetworkId: jumpHostVnet.id,
        },
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
        tlsEnabled: false,
        tlsSecret: "",
      });

      if (i == 1) {
        etcdIP = cs.etcdIp;
      }
    }
  }
}
