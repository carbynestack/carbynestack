/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";

export interface CastorConfig {
  helmProvider: cdktf.TerraformProvider;
  dependsOn: cdktf.TerraformResource[];
  isMaster: boolean;
  partnerFQDN: string;
}

export class Castor extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: CastorConfig) {
    super(scope, name);

    this.release = new helm.release.Release(this, `castor`, {
      dependsOn: config.dependsOn,
      provider: config.helmProvider,
      timeout: 600,
      name: "cs-castor",
      chart: "castor",
      repository: "oci://ghcr.io/carbynestack",
      version: "0.2.0",
      set: [
        { name: "castor.noSslValidation", value: "true" },
        { name: "castor.image.registry", value: "ghcr.io" },
        {
          name: "castor.image.repository",
          value: "carbynestack/castor-service",
        },
        {
          name: "castor.image.tag",
          value: "0.1.1",
        },
        { name: "castor.isMaster", value: `${config.isMaster}` },
        ...(config.isMaster
          ? [
              {
                name: "castor.slaveUri",
                value: `http://${config.partnerFQDN}/castor`,
              },
            ]
          : []),
        { name: "castor.minio.endpoint", value: "http://cs-minio:9000" },
        { name: "castor.redis.host", value: "cs-redis-master" },
        { name: "castor.db.host", value: "cs-cs-postgres-dbms" },
        {
          name: "castor.db.userSecretName",
          value: "cs.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do",
        },
        {
          name: "castor.db.passwordSecretName",
          value: "cs.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do",
        },
        { name: "castor.logLevel", value: "DEBUG" },
        { name: "service.type", value: "ClusterIP" },
        { name: "service.annotations", value: "null" },
      ],
    });
  }
}
