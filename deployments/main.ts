/*
 * Copyright (c) 2023-2024 - for information on the respective copyright owner see
 * the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdktf from "cdktf";
import LocalKindCluster from "./stacks/local-kind-cluster";
import AzureCluster from "./stacks/azure-cluster";
import AzureJump from "./stacks/azure-jump";
import AzurePrivateCluster from "./stacks/azure-private-cluster";

const app = new cdktf.App();

// Local stack using KinD (Kubernetes in Docker)
// eslint-disable-next-line no-new
new LocalKindCluster(app, "local-kind");

// Azure Stacks
// eslint-disable-next-line no-new
new AzureCluster(app, "azure-cluster");
// eslint-disable-next-line no-new
new AzureJump(app, "azure-jump");
new AzurePrivateCluster(app, "azure-private-cluster", {
  jumpHostResourceGroup: process.env.JUMP_HOST_RESOURCE_GROUP!,
  jumpHostVirtualNetworkName: process.env.JUMP_HOST_VIRTUAL_NETWORK_NAME!,
});

app.synth();
