// @ts-nocheck
const resolve = require("resolve");

module.exports = (path, options) =>
  resolve.sync(path, { ...options, preserveSymlinks: true });