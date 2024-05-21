/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";

export interface RedisConfig {
  helmProvider: cdktf.TerraformProvider;
}
export class Redis extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: RedisConfig) {
    super(scope, name);

    this.release = new helm.release.Release(this, `redis`, {
      name: "cs-redis",
      repository: "https://charts.bitnami.com/bitnami/",
      chart: "redis",
      version: "19.3.4",
      timeout: 600,
      provider: config.helmProvider,
      set: [
        { name: "architecture", value: "standalone" },
        { name: "auth.enabled", value: "false" },
        { name: "master.persistence.enabled", value: "true" },
        { name: "master.persistence.size", value: "1Gi" },
      ],
    });
  }
}
