/*
 * Copyright (c) 2023 - for information on the respective copyright owner
 * see the NOTICE file and/or the repository https://github.com/carbynestack/carbynestack.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-empty": [0, "never"],
    "scope-enum": [2, "always", ["sdk"]],
  },
};
