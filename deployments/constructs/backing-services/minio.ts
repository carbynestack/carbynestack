/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";

export interface MinioConfig {
  helmProvider: cdktf.TerraformProvider;
}

export class Minio extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: MinioConfig) {
    super(scope, name);

    this.release = new helm.release.Release(this, `minio`, {
      provider: config.helmProvider,
      name: "cs-minio",
      chart: "minio",
      repository: "https://charts.min.io/",
      version: "3.6.6",
      set: [
        { name: "images.repository", value: "quay.io/minio/minio" },
        { name: "images.tag", value: "RELEASE.2022-04-16T04-26-02Z" },
        { name: "mcImage.repository", value: "quay.io/minio/mc" },
        { name: "mcImage.tag", value: "RELEASE.2022-04-16T21-11-21Z" },
        { name: "mode", value: "standalone" },
        { name: "rootUser", value: "dummy-key" },
        { name: "rootPassword", value: "dummy-secret" },
        { name: "replicas", value: "1" },
        { name: "persistence.enabled", value: "true" },
        { name: "persistence.size", value: "1Gi" },
        { name: "resources.limits.memory", value: "256Mi" },
        { name: "resources.requests.memory", value: "256Mi" },
      ],
    });
  }
}
