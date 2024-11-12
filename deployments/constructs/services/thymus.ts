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

export interface ThymusConfig {
  helmProvider: cdktf.TerraformProvider;
  dependsOn: cdktf.TerraformResource[];
  fqdn: string;
  thymusSecret: string;
}

export class Thymus extends Construct {
  public release: cdktf.TerraformResource;

  constructor(scope: Construct, name: string, config: ThymusConfig) {
    super(scope, name);

    const thymusChart = new cdktf.TerraformAsset(this, "thymus-chart-path", {
      path: path.resolve(__dirname, "../../../../thymus/charts/thymus"),
      type: cdktf.AssetType.DIRECTORY,
    });

    this.release = new helm.release.Release(this, `thymus`, {
      dependsOn: config.dependsOn,
      provider: config.helmProvider,
      timeout: 600,
      name: "cs-thymus",
      chart: `./${thymusChart.path}`,
      //repository: "https://k8s.ory.sh/helm/charts", // TODO: Change to actual repository once chart is deployed
      set: [
        {
          name: "thymus.gateway.enabled",
          value: "false",
        },
        {
          name: "thymus.users.enabled",
          value: "true",
        },
        // kratos.kratos
        {
          name: "kratos.kratos.config.session.cookie.domain",
          value: config.fqdn,
        },
        {
          name: "kratos.kratos.config.cookies.domain",
          value: config.fqdn,
        },
        {
          name: "kratos.kratos.config.serve.public.base_url",
          value: `http://${config.fqdn}/iam`,
        },
        {
          name: "kratos.kratos.config.serve.admin.base_url",
          value: `http://${config.fqdn}/iam/admin`,
        },
        {
          name: "kratos.kratos.config.selfservice.default_browser_return_url",
          value: `http://${config.fqdn}/iam/ui`,
        },
        {
          name: "kratos.kratos.config.selfservice.allowed_return_urls",
          value: `{http://${config.fqdn}/iam/ui}`, // TODO: Check if this is correct, its a list item
        },
        {
          name: "kratos.kratos.config.selfservice.flows.error.ui_url",
          value: `http://${config.fqdn}/iam/ui/error`,
        },
        {
          name: "kratos.kratos.config.selfservice.flows.settings.ui_url",
          value: `http://${config.fqdn}/iam/ui/settings`,
        },
        {
          name: "kratos.kratos.config.selfservice.flows.logout.after.default_browser_return_url",
          value: `http://${config.fqdn}/iam/ui/login`,
        },
        {
          name: "kratos.kratos.config.selfservice.flows.login.ui_url",
          value: `http://${config.fqdn}/iam/ui/login`,
        },
        {
          name: "kratos.kratos.config.selfservice.flows.registration.ui_url",
          value: `http://${config.fqdn}/iam/ui/registration`,
        },
        {
          name: "kratos.kratos.config.secrets.default",
          value: `{${config.thymusSecret}}`,
        },
        {
          name: "kratos.kratos.config.oauth2_provider.url",
          value: `http://cs-thymus-hydra-admin:4445`,
        },
        // kratos.deployment
        {
          name: "kratos.deployment.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "kratos.deployment.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.deployment.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "kratos.deployment.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "kratos.deployment.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.deployment.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "kratos.deployment.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "kratos.deployment.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/kratos`,
        },
        // kratos.deployment.automigration
        {
          name: "kratos.deployment.automigration.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "kratos.deployment.automigration.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.deployment.automigration.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "kratos.deployment.automigration.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "kratos.deployment.automigration.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.deployment.automigration.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "kratos.deployment.automigration.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "kratos.deployment.automigration.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/kratos`,
        },
        // kratos.statefulSet
        {
          name: "kratos.statefulSet.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "kratos.statefulSet.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.statefulSet.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "kratos.statefulSet.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "kratos.statefulSet.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.statefulSet.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "kratos.statefulSet.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "kratos.statefulSet.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/kratos`,
        },
        // kratos.job
        {
          name: "kratos.job.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "kratos.job.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.job.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "kratos.job.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "kratos.job.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "kratos.job.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "kratos.job.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "kratos.job.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/kratos`,
        },
        // kratos.cronjob
        {
          name: "kratos.cronjob.cleanup.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "kratos.cronjob.cleanup.extraEnv[0].valueFrom.secretKeyRef.name",
          value:
            "kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do",
        },
        {
          name: "kratos.cronjob.cleanup.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "kratos.cronjob.cleanup.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "kratos.cronjob.cleanup.extraEnv[1].valueFrom.secretKeyRef.name",
          value:
            "kratos.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do",
        },
        {
          name: "kratos.cronjob.cleanup.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "kratos.cronjob.cleanup.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "kratos.cronjob.cleanup.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/kratos`,
        },
        // hydra.hydra
        {
          name: "hydra.hydra.config.serve.cookies.domain",
          value: config.fqdn,
        },
        {
          name: "hydra.hydra.config.urls.self.issuer",
          value: `http://${config.fqdn}/iam/oauth`,
        },
        {
          name: "hydra.hydra.config.urls.consent",
          value: `http://${config.fqdn}/iam/ui/consent`,
        },
        {
          name: "hydra.hydra.config.urls.login",
          value: `http://${config.fqdn}/iam/ui/login`,
        },
        {
          name: "hydra.hydra.config.urls.logout",
          value: `http://${config.fqdn}/iam/ui/logout`,
        },
        {
          name: "hydra.hydra.config.urls.identity_provider.publicUrl",
          value: `http://${config.fqdn}/iam`,
        },
        {
          name: "hydra.hydra.config.urls.identity_provider.url",
          value: `http://${config.fqdn}/iam/admin`,
        },
        {
          name: "hydra.hydra.config.secrets.system",
          value: `{${config.thymusSecret}}`, // TODO: Check if that is correct, it's a list element
        },
        {
          name: "hydra.hydra.config.oidc.subject_identifiers.pairwise.salt",
          value: `${config.thymusSecret}`,
        },
        //hydra.deployment
        {
          name: "hydra.deployment.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "hydra.deployment.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.deployment.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "hydra.deployment.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "hydra.deployment.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.deployment.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "hydra.deployment.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "hydra.deployment.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/hydra`,
        },
        // hydra.deployment.automigration
        {
          name: "hydra.deployment.automigration.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "hydra.deployment.automigration.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.deployment.automigration.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "hydra.deployment.automigration.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "hydra.deployment.automigration.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.deployment.automigration.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "hydra.deployment.automigration.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "hydra.deployment.automigration.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/hydra`,
        },
        // hydra.job
        {
          name: "hydra.job.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "hydra.job.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.job.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "hydra.job.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "hydra.job.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.job.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "hydra.job.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "hydra.job.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/hydra`,
        },
        // hydra.cronjob
        {
          name: "hydra.cronjob.janitor.extraEnv[0].name",
          value: "DB_USER",
        },
        {
          name: "hydra.cronjob.janitor.extraEnv[0].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.cronjob.janitor.extraEnv[0].valueFrom.secretKeyRef.key",
          value: "username",
        },
        {
          name: "hydra.cronjob.janitor.extraEnv[1].name",
          value: "DB_PASSWORD",
        },
        {
          name: "hydra.cronjob.janitor.extraEnv[1].valueFrom.secretKeyRef.name",
          value: `hydra.cs-cs-postgres-dbms.credentials.postgresql.acid.zalan.do`,
        },
        {
          name: "hydra.cronjob.janitor.extraEnv[1].valueFrom.secretKeyRef.key",
          value: "password",
        },
        {
          name: "hydra.cronjob.janitor.extraEnv[2].name",
          value: "DSN",
        },
        {
          name: "hydra.cronjob.janitor.extraEnv[2].value",
          value: `postgres://$(DB_USER):$(DB_PASSWORD)@cs-cs-postgres-dbms:5432/hydra`,
        },
        // kratos-self-service-ui-node
        {
          name: "kratos-selfservice-ui-node.deployment.extraEnv[0].name",
          value: "HYDRA_ADMIN_URL",
        },
        {
          name: "kratos-selfservice-ui-node.deployment.extraEnv[0].value",
          value: `http://cs-thymus-hydra-admin:4445`,
        },
        {
          name: "kratos-selfservice-ui-node.kratosPublicUrl",
          value: `http://cs-thymus-kratos-public:80`,
        },
        {
          name: "kratos-selfservice-ui-node.kratosBrowserUrl",
          value: `http://${config.fqdn}/iam`,
        },
        {
          name: "kratos-selfservice-ui-node.config.csrfCookieName",
          value: `cs-thymus`,
        },
      ],
    });
  }
}
