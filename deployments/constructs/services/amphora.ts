/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";

export interface AmphoraConfig {
  helmProvider: cdktf.TerraformProvider;
  dependsOn: cdktf.TerraformResource[];
  isMaster: boolean;
  partnerFQDN: string;
  noSSLValidation: boolean;
  prime?: string;
  r?: string;
  rInv?: string;
}

export class Amphora extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: AmphoraConfig) {
    super(scope, name);

    this.release = new helm.release.Release(this, `amphora`, {
      dependsOn: config.dependsOn,
      provider: config.helmProvider,
      timeout: 600,
      name: "cs-amphora",
      chart: "amphora",
      repository: "oci://ghcr.io/carbynestack",
      version: "0.1.1",
      set: [
        {
          name: "spdz.macKey",
          value: config.isMaster
            ? "-88222337191559387830816715872691188861"
            : "1113507028231509545156335486838233835",
          type: "string",
        },
        {
          name: "spdz.prime",
          value: config.prime ?? "198766463529478683931867765928436695041",
          type: "string",
        },
        {
          name: "spdz.r",
          value: config.r ?? "141515903391459779531506841503331516415",
          type: "string",
        },
        {
          name: "spdz.rInv",
          value: config.rInv ?? "133854242216446749056083838363708373830",
          type: "string",
        },
        {
          name: "amphora.playerId",
          value: config.isMaster ? "0" : "1",
        },
        {
          name: "amphora.vcPartner",
          value: `http://${config.partnerFQDN}/amphora`,
        },
        {
          name: "amphora.noSslValidation",
          value: `${config.noSSLValidation}`,
        },
        {
          name: "amphora.image.registry",
          value: "ghcr.io",
        },
        {
          name: "amphora.image.repository",
          value: "carbynestack/amphora-service",
        },
        {
          name: "amphora.image.tag",
          value: "0.1.1",
        },
        {
          name: "amphora.castor.serviceUri",
          value: "http://cs-castor:10100",
        },
        {
          name: "amphora.redis.host",
          value: "cs-redis-master",
        },
        {
          name: "amphora.minio.endpoint",
          value: "http://cs-minio:9000",
        },
        {
          name: "amphora.db.host",
          value: "cs-cs-postgres-dbms",
        },
        {
          name: "amphora.db.userSecretName",
          value: "cs.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do",
        },
        {
          name: "amphora.db.passwordSecretName",
          value: "cs.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do",
        },
        {
          name: "amphora.logLevel",
          value: "DEBUG",
        },
        { name: "service.type", value: "ClusterIP" },
        {
          name: "service.annotations",
          value: "null",
        },
      ],
    });
  }
}
