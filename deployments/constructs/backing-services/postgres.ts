/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from "constructs";
import * as helm from "@cdktf/provider-helm";
import * as cdktf from "cdktf";
import * as path from "path";

export interface PostgresConfig {
  helmProvider: cdktf.TerraformProvider;
}

export class Postgres extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: PostgresConfig) {
    super(scope, name);

    const postgresOperator = new helm.release.Release(
      this,
      `postgres-operator`,
      {
        provider: config.helmProvider,
        name: "postgres-operator",
        chart: "postgres-operator",
        version: "1.11.0",
        repository:
          "https://opensource.zalando.com/postgres-operator/charts/postgres-operator",
      },
    );

    const postgresDBMSChart = new cdktf.TerraformAsset(
      this,
      "postgres-dbms-chart-path",
      {
        path: path.resolve(__dirname, "../../charts/postgres-dbms"),
        type: cdktf.AssetType.DIRECTORY,
      },
    );

    this.release = new helm.release.Release(this, `postgres-dbms`, {
      dependsOn: [postgresOperator],
      provider: config.helmProvider,
      name: "cs-postgres",
      chart: `./${postgresDBMSChart.path}`,
      set: [
        { name: "users.cs[0]", value: "superuser" },
        { name: "users.cs[1]", value: "createdb" },
        { name: "users.cs[2]", value: "login" },
        { name: "databases.castor", value: "cs" },
        { name: "databases.amphora", value: "cs" },
      ],
    });
  }
}
