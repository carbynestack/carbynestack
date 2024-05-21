/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as azurerm from "@cdktf/provider-azurerm";

/*
 * Creates an Azure jump host to deploy a private AKS cluster in a private network
 */
export default class AzureJump extends cdktf.TerraformStack {
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
    const resourceGroup = new azurerm.resourceGroup.ResourceGroup(
      this,
      "rg-cs-jump",
      {
        name: "rg-cs-jump",
        location: "northeurope",
      },
    );

    // input variables for admin password
    const adminPassword = new cdktf.TerraformVariable(this, "admin_password", {
      type: "string",
      description:
        "The admin password for the jump host - please set it via: ckdktf deploy <stack> --var='admin_password=<your_password>'",
    });

    // virtual network
    const virtualNetwork = new azurerm.virtualNetwork.VirtualNetwork(
      this,
      "vn-cs-jump",
      {
        name: "vn-cs-jump",
        location: resourceGroup.location,
        resourceGroupName: resourceGroup.name,
        addressSpace: ["10.0.0.0/16"],
      },
    );

    // subnet
    const subnet = new azurerm.subnet.Subnet(this, "sn-cs-jump", {
      name: "sn-cs-jump",
      resourceGroupName: resourceGroup.name,
      virtualNetworkName: virtualNetwork.name,
      addressPrefixes: ["10.0.1.0/24"],
    });

    // public ip
    const publicIp = new azurerm.publicIp.PublicIp(this, "pip-cs-jump", {
      name: "pip-cs-jump",
      location: resourceGroup.location,
      resourceGroupName: resourceGroup.name,
      allocationMethod: "Dynamic",
    });

    // network interface
    const networkInterface = new azurerm.networkInterface.NetworkInterface(
      this,
      "ni-cs-jump",
      {
        name: "ni-cs-jump",
        location: resourceGroup.location,
        resourceGroupName: resourceGroup.name,
        ipConfiguration: [
          {
            name: "ip-cs-jump",
            subnetId: subnet.id,
            privateIpAddressAllocation: "Dynamic",
            publicIpAddressId: publicIp.id,
          },
        ],
      },
    );

    // network security group
    const networkSecurityGroup =
      new azurerm.networkSecurityGroup.NetworkSecurityGroup(
        this,
        "nsg-cs-jump",
        {
          name: "nsg-cs-jump",
          location: resourceGroup.location,
          resourceGroupName: resourceGroup.name,
          securityRule: [
            {
              name: "ssh",
              priority: 1001,
              direction: "Inbound",
              access: "Allow",
              protocol: "Tcp",
              sourceAddressPrefix: "*",
              sourcePortRange: "*",
              destinationAddressPrefix: "*",
              destinationPortRange: "22",
            },
          ],
        },
      );

    // association
    new azurerm.networkInterfaceSecurityGroupAssociation.NetworkInterfaceSecurityGroupAssociation(
      this,
      "ni-nsg-cs-jump",
      {
        networkInterfaceId: networkInterface.id,
        networkSecurityGroupId: networkSecurityGroup.id,
      },
    );

    // create a jump host virtual machine
    const jumpHostVirtualMachine =
      new azurerm.linuxVirtualMachine.LinuxVirtualMachine(this, "cs-vm-jump", {
        name: "cs-vm-jump",
        location: resourceGroup.location,
        resourceGroupName: resourceGroup.name,
        networkInterfaceIds: [networkInterface.id],
        size: "Standard_DS2_v2",
        osDisk: {
          caching: "ReadWrite",
          storageAccountType: "Standard_LRS",
        },
        sourceImageReference: {
          publisher: "Canonical",
          offer: "0001-com-ubuntu-server-jammy",
          sku: "22_04-lts-gen2",
          version: "latest",
        },
        computerName: "cs-jump-vm",
        adminUsername: "cs",
        adminPassword: adminPassword.value,
        disablePasswordAuthentication: false,
      });

    // output the public ip address of the jump host
    new cdktf.TerraformOutput(this, "jump-host-ip", {
      value: jumpHostVirtualMachine.publicIpAddress,
    });
  }

  // output the public ip address of the jump host
}
