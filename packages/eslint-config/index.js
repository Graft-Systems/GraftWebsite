// @graft/eslint-config
//
// Default export = the node config (safest baseline).
// Apps and services should import from a more specific subpath:
//   import config from "@graft/eslint-config/nextjs";
//   import config from "@graft/eslint-config/react-native";
//   import config from "@graft/eslint-config/node";
//
// At M0-01 this is a skeleton; real rule sets land in M0-02 alongside the
// CI workflow that enforces them.

import nodeConfig from "./node.js";

export default nodeConfig;
