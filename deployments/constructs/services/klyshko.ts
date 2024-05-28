/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";
import * as path from "path";

export interface KlyshkoConfig {
  helmProvider: cdktf.TerraformProvider;
  dependsOn: cdktf.ITerraformDependable[];
  isMaster: boolean;
  prime: string;
  etcdIp: string;
}

export class Klyshko extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: KlyshkoConfig) {
    super(scope, name);

    const klyshkoOperator = new helm.release.Release(this, `klyshko-operator`, {
      dependsOn: config.dependsOn,
      provider: config.helmProvider,
      name: "cs-klyshko-operator",
      chart: "klyshko",
      repository: "oci://ghcr.io/carbynestack",
      version: "0.4.0",
      wait: true,
      waitForJobs: true,
      set: [
        {
          name: "controller.image.registry",
          value: "ghcr.io",
        },
        {
          name: "controller.image.repository",
          value: "carbynestack/klyshko-operator",
        },
        {
          name: "controller.image.tag",
          value: "0.3.0",
        },
        {
          name: "controller.etcdEndpoint",
          value: `${config.etcdIp}:2379`,
        },
        {
          name: "provisioner.image.registry",
          value: "ghcr.io",
        },
        {
          name: "provisioner.image.repository",
          value: "carbynestack/klyshko-provisioner",
        },
        {
          name: "provisioner.image.tag",
          value: "0.1.1",
        },
      ],
    });

    const klyshkoChart = new cdktf.TerraformAsset(
      this,
      "klyshko-dbms-chart-path",
      {
        path: path.resolve(__dirname, "../../charts/klyshko"),
        type: cdktf.AssetType.DIRECTORY,
      },
    );

    this.release = new helm.release.Release(this, `klyshko`, {
      dependsOn: [klyshkoOperator],
      provider: config.helmProvider,
      timeout: 600,
      name: "cs-klyshko",
      chart: `./${klyshkoChart.path}`,
      set: [
        { name: "scheduler.enabled", value: `${config.isMaster}` },
        { name: "scheduler.concurrency", value: "2" },
        { name: "scheduler.threshold", value: "50000" },
        { name: "scheduler.ttlSecondsAfterFinished", value: "120" },
        {
          name: "scheduler.generator.image",
          value: "ghcr.io/carbynestack/klyshko-mp-spdz:0.2.0",
        },
        {
          name: "scheduler.generator.imagePullPolicy",
          value: "IfNotPresent",
        },
        {
          name: "playerCount",
          value: "2",
        },
        {
          name: "playerId",
          value: config.isMaster ? "0" : "1",
        },
        {
          name: "engineParams.prime",
          value: config.prime,
          type: "string",
        },
        {
          name: "engineParams.macKeyShares.0.p",
          value: "-88222337191559387830816715872691188861",
          type: "string",
        },
        {
          name: "engineParams.macKeyShares.0.2",
          value: "f0cf6099e629fd0bda2de3f9515ab72b",
          type: "string",
        },
        {
          name: "engineParams.macKeyShares.1.p",
          value: "1113507028231509545156335486838233835",
          type: "string",
        },
        {
          name: "engineParams.macKeyShares.1.2",
          value: "c347ce3d9e165e4e85221f9da7591d98",
          type: "string",
        },
      ],
    });
  }
}
