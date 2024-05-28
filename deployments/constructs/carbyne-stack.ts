/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdktf from "cdktf";
import * as helm from "@cdktf/provider-helm";
import * as path from "path";
import { Construct } from "constructs";
import { Knative } from "./backing-services/knative";
import { Postgres } from "./backing-services/postgres";
import { Minio } from "./backing-services/minio";
import { Redis } from "./backing-services/redis";
import { Etcd } from "./backing-services/etcd";
import { Castor } from "./services/castor";
import { Amphora } from "./services/amphora";
import { Ephemeral } from "./services/ephemeral";
import { Klyshko } from "./services/klyshko";

export interface CarbyneStackConfig {
  dependsOn: cdktf.ITerraformDependable[];
  helmProvider: cdktf.TerraformProvider;
  kubernetesProvider: cdktf.TerraformProvider;
  kubectlProvider: cdktf.TerraformProvider;
  fqdn: string;
  partnerFQDN: string;
  isMaster: boolean;
  masterHost: string;
  masterPort?: string;
  etcdIP?: string;
  noSSLValidation: boolean;
  macKey: string;
  prime: string;
  r: string;
  rInv: string;
  gfpMacKey: string;
  gf2nMacKey: string;
  gf2nBitLength: number;
  gf2nStorageSize: number;
  noJWTAuthn: boolean;
  jwtIssuer: string;
  jwksUri: string;
}

export class CarbyneStack extends Construct {
  public etcdIp?: string;

  constructor(scope: Construct, name: string, config: CarbyneStackConfig) {
    super(scope, name);

    // backing services

    const postgres = new Postgres(this, `postgres`, {
      helmProvider: config.helmProvider,
    });

    const minio = new Minio(this, `minio`, {
      helmProvider: config.helmProvider,
    });

    let etcd: Etcd | undefined;
    if (config.isMaster) {
      etcd = new Etcd(this, `etcd`, {
        helmProvider: config.helmProvider,
        kubernetesProvider: config.kubernetesProvider,
      });

      this.etcdIp = etcd.etcdIp;
    }

    const redis = new Redis(this, `redis`, {
      helmProvider: config.helmProvider,
    });

    const knative = new Knative(this, `knative-${name}`, {
      ingressIP: config.fqdn,
      kubectlProvider: config.kubectlProvider,
      kubernetesProvider: config.kubernetesProvider,
    });

    // carbyne stack services

    const castor = new Castor(this, `castor`, {
      helmProvider: config.helmProvider,
      dependsOn: [minio.release, postgres.release, redis.release],
      isMaster: config.isMaster,
      partnerFQDN: config.partnerFQDN,
    });

    const amphora = new Amphora(this, `amphora`, {
      helmProvider: config.helmProvider,
      dependsOn: [
        minio.release,
        postgres.release,
        redis.release,
        castor.release,
      ],
      isMaster: config.isMaster,
      partnerFQDN: config.partnerFQDN,
      noSSLValidation: config.noSSLValidation,
      prime: config.prime,
      r: config.r,
      rInv: config.rInv,
    });

    new Ephemeral(this, `ephemeral`, {
      helmProvider: config.helmProvider,
      dependsOn: [
        knative.knativeServing,
        knative.knativeOperator,
        amphora.release,
        castor.release,
      ],
      fqdn: config.fqdn,
      isMaster: config.isMaster,
      masterHost: config.masterHost,
      masterPort: config.masterPort,
      prime: config.prime,
      rInv: config.rInv,
      gfpMacKey: config.gfpMacKey,
      gf2nMacKey: config.gf2nMacKey,
      gf2nBitLength: config.gf2nBitLength,
      gf2nStorageSize: config.gf2nStorageSize,
    });

    new Klyshko(this, `klyshko`, {
      helmProvider: config.helmProvider,
      dependsOn: [
        ...(etcd ? [etcd.release] : []),
        minio.release,
        postgres.release,
        castor.release,
      ],
      isMaster: config.isMaster,
      prime: config.prime,
      etcdIp: config.etcdIP ?? "cs-etcd",
    });

    const istioChart = new cdktf.TerraformAsset(this, "istio-chart-path", {
      path: path.resolve(__dirname, "../charts/istio"),
      type: cdktf.AssetType.DIRECTORY,
    });

    new helm.release.Release(this, `istio`, {
      dependsOn: [amphora.release, castor.release],
      provider: config.helmProvider,
      name: "cs-istio",
      chart: `./${istioChart.path}`,
      set: [
        { name: "routes.hosts.amphora", value: "cs-amphora" },
        { name: "routes.hosts.castor", value: "cs-castor" },
        { name: "frontendUrl", value: config.fqdn },
        { name: "authn.disabled", value: `${config.noJWTAuthn}` },
        { name: "authn.jwtRules.issuer", value: config.jwtIssuer },
        { name: "authn.jwtRules.jwksUri", value: config.jwksUri },
      ],
    });
  }
}
