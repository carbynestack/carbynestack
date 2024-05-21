/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";

export interface EphemeralConfig {
  helmProvider: cdktf.TerraformProvider;
  dependsOn: cdktf.TerraformResource[];
  fqdn: string;
  isMaster: boolean;
  masterHost: string;
  masterPort?: string;
  prime: string;
  rInv: string;
  gfpMacKey: string;
  gf2nMacKey: string;
  gf2nBitLength: number;
  gf2nStorageSize: number;
}

export class Ephemeral extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: EphemeralConfig) {
    super(scope, name);

    this.release = new helm.release.Release(this, `ephemeral`, {
      dependsOn: config.dependsOn,
      provider: config.helmProvider,
      name: "cs-ephemeral",
      chart: "ephemeral",
      repository: "oci://ghcr.io/carbynestack",
      version: "0.1.3",
      timeout: 600,
      set: [
        {
          name: "discovery.image.registry",
          value: "ghcr.io",
        },
        {
          name: "discovery.image.repository",
          value: "carbynestack/ephemeral/discovery",
        },
        {
          name: "discovery.image.tag",
          value: "0.1.13",
        },
        {
          name: "discovery.frontendUrl",
          value: config.fqdn,
        },
        {
          name: "discovery.isMaster",
          value: `${config.isMaster}`,
        },
        {
          name: "discovery.master.host",
          value: config.masterHost,
        },
        {
          name: "discovery.master.port",
          value: config.masterPort ?? "31400",
        },
        {
          name: "ephemeral.image.registry",
          value: "ghcr.io",
        },
        {
          name: "ephemeral.image.repository",
          value: "carbynestack/ephemeral/ephemeral",
        },
        {
          name: "ephemeral.image.tag",
          value: "0.1.13",
        },
        {
          name: "ephemeral.resources.requests.memory",
          value: "256Mi",
        },
        {
          name: "ephemeral.resources.requests.cpu",
          value: "100m",
        },
        {
          name: "ephemeral.minScale",
          value: "1",
        },
        {
          name: "ephemeral.amphora.host",
          value: "cs-amphora:10000",
        },
        {
          name: "ephemeral.amphora.scheme",
          value: "http",
        },
        {
          name: "ephemeral.amphora.path",
          value: "/",
        },
        {
          name: "ephemeral.castor.host",
          value: "cs-castor:10100",
        },
        {
          name: "ephemeral.castor.scheme",
          value: "http",
        },
        {
          name: "ephemeral.castor.path",
          value: "/",
        },
        {
          name: "ephemeral.frontendUrl",
          value: config.fqdn,
        },
        {
          name: "ephemeral.discovery.host",
          value: "cs-ephemeral-discovery",
        },
        {
          name: "ephemeral.discovery.port",
          value: "8080",
        },
        {
          name: "ephemeral.discovery.connectTimeout",
          value: "60s",
        },
        {
          name: "ephemeral.playerId",
          value: config.isMaster ? "0" : "1",
        },
        {
          name: "ephemeral.networkEstablishTimeout",
          value: "60s",
        },
        {
          name: "ephemeral.player.stateTimeout",
          value: "60s",
        },
        {
          name: "ephemeral.player.computationTimeout",
          value: "600s",
        },
        {
          name: "ephemeral.spdz.prime",
          value: config.prime,
        },
        {
          name: "ephemeral.spdz.rInv",
          value: config.rInv,
        },
        {
          name: "ephemeral.spdz.gfpMacKey",
          value: config.gfpMacKey,
        },
        {
          name: "ephemeral.spdz.gf2nMacKey",
          value: config.gf2nMacKey,
        },
        {
          name: "ephemeral.spdz.gf2nBitLength",
          value: `${config.gf2nBitLength}`,
        },
        {
          name: "ephemeral.spdz.gf2nStorageSize",
          value: `${config.gf2nStorageSize}`,
        },
        {
          name: "networkController.image.registry",
          value: "ghcr.io",
        },
        {
          name: "networkController.image.repository",
          value: "carbynestack/ephemeral/network-controller",
        },
        {
          name: "networkController.image.tag",
          value: "0.1.13",
        },
      ],
    });
  }
}
