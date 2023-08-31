/*
 * Copyright (c) 2023 - for information on the respective copyright owner
 * see the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as kind from "../.gen/providers/kind";
import * as cdktf from "cdktf";

export interface KindClusterConfig {
  name: string;
  kindProvider?: cdktf.TerraformProvider;
  idPostfix?: string;
}

export class KindCluster extends Construct {
  public kubeConfigPath: string;

  constructor(scope: Construct, name: string, config: KindClusterConfig) {
    super(scope, name);

    const kindCluster = new kind.cluster.Cluster(
      this,
      `kind${config.idPostfix}`,
      {
        provider: config.kindProvider,
        name: config.name,
        waitForReady: true,
      },
    );

    this.kubeConfigPath = kindCluster.kubeconfigPath;
  }
}
