/*
 * Copyright (c) 2023 - for information on the respective copyright owner
 * see the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdktf from "cdktf";
import LocalKindStack from "./stacks/local-kind-stack";

const app = new cdktf.App();

// Local stack using KinD (Kubernetes in Docker)
// eslint-disable-next-line no-new
new LocalKindStack(app, "local-kind");

app.synth();
