/*
 * Copyright (c) 2023 - for information on the respective copyright owner
 * see the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";
import { Construct } from "constructs";
import * as path from "path";

export interface CarbyneStackConfig {
  dependsOn: cdktf.ITerraformDependable[];
  helmProvider: cdktf.TerraformProvider;
  fqdn: string;
  partnerFQDN: string;
  isMaster: boolean;
  masterHost: string;
  masterPort?: string;
  noSSLValidation: boolean;
  macKey: string;
  prime: string;
  r: string;
  rInv: string;
  gfpMacKey: string;
  gf2nMacKey: string;
  gf2nBitLength: number;
  gf2nStorageSize: number;
}

export class CarbyneStack extends Construct {
  constructor(scope: Construct, name: string, config: CarbyneStackConfig) {
    super(scope, name);

    const dependables: cdktf.ITerraformDependable[] = config.dependsOn;

    const postgresDBMSChart = new cdktf.TerraformAsset(
      this,
      "postgres-dbms-chart-path",
      {
        path: path.resolve(__dirname, "../charts/postgres-dbms"),
        type: cdktf.AssetType.DIRECTORY,
      },
    );

    const postgresDBMS = new helm.release.Release(this, `postgres-dbms`, {
      dependsOn: [...dependables],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
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

    dependables.push(postgresDBMS);

    const minio = new helm.release.Release(this, `minio`, {
      dependsOn: [...dependables],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
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

    dependables.push(minio);

    const istioChart = new cdktf.TerraformAsset(this, "istio-chart-path", {
      path: path.resolve(__dirname, "../charts/istio"),
      type: cdktf.AssetType.DIRECTORY,
    });

    const istio = new helm.release.Release(this, `istio`, {
      dependsOn: [...dependables],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
      name: "cs-istio",
      chart: `./${istioChart.path}`,
      set: [
        { name: "routes.hosts.amphora", value: "cs-amphora" },
        { name: "routes.hosts.castor", value: "cs-castor" },
      ],
    });

    dependables.push(istio);

    if (config.isMaster) {
      const etcd = new helm.release.Release(this, `etcd`, {
        dependsOn: [...dependables],
        provider: config.helmProvider,
        wait: true,
        waitForJobs: true,
        name: "cs-etcd",
        chart: "etcd",
        repository: "https://charts.bitnami.com/bitnami/",
        version: "8.3.1",
        set: [
          { name: "auth.rbac.create", value: "false" },
          { name: "service.type", value: "LoadBalancer" },
        ],
      });

      dependables.push(etcd);
    }

    const redis = new helm.release.Release(this, `redis`, {
      name: "cs-redis",
      repository: "https://charts.bitnami.com/bitnami/",
      chart: "redis",
      dependsOn: [...dependables],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
      set: [
        { name: "architecture", value: "standalone" },
        { name: "auth.enabled", value: "false" },
        { name: "master.persistence.enabled", value: "true" },
        { name: "master.persistence.size", value: "1Gi" },
      ],
    });

    dependables.push(redis);

    const castor = new helm.release.Release(this, `castor`, {
      dependsOn: [...dependables, minio, postgresDBMS],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
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

    dependables.push(castor);

    const amphora = new helm.release.Release(this, `amphora`, {
      dependsOn: [...dependables, minio, postgresDBMS, castor],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
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

    dependables.push(amphora);

    const ephemeral = new helm.release.Release(this, `ephemeral`, {
      dependsOn: [...dependables, minio, postgresDBMS, castor],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
      name: "cs-ephemeral",
      chart: "ephemeral",
      repository: "oci://ghcr.io/carbynestack",
      version: "0.1.3",
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

    dependables.push(ephemeral);

    const klyshkoOperator = new helm.release.Release(this, `klyshko-operator`, {
      dependsOn: [...dependables, minio, postgresDBMS, castor],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
      name: "cs-klyshko-operator",
      chart: "klyshko",
      repository: "oci://ghcr.io/carbynestack",
      version: "0.4.0",
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
          value: "172.18.1.129:2379",
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

    dependables.push(klyshkoOperator);

    const klyshkoChart = new cdktf.TerraformAsset(
      this,
      "klyshko-dbms-chart-path",
      {
        path: path.resolve(__dirname, "../charts/klyshko"),
        type: cdktf.AssetType.DIRECTORY,
      },
    );

    new helm.release.Release(this, `klyshko`, {
      dependsOn: [...dependables],
      provider: config.helmProvider,
      wait: true,
      waitForJobs: true,
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
