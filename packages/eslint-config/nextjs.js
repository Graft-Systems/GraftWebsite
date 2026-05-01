// @graft/eslint-config/nextjs
//
// ESLint flat config for Next.js apps (apps/web).
// At M0-01 this is a placeholder; real rules land in M0-02 with the rest of
// the linting pipeline. Until then, apps/web continues to use its existing
// eslint.config.mjs.

import nodeConfig from "./node.js";

export default [
  ...nodeConfig
];
