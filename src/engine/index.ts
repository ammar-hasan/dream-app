/**
 * Public engine API — the stable surface for programmatic consumers
 * (the MCP server, scripts, and apps embedding Dream's document model).
 *
 * Everything re-exported here follows semantic versioning with the app:
 * breaking changes bump the minor/major version and land in CHANGELOG.md.
 * Modules NOT re-exported here (selection, symmetry, spray internals, the
 * tool state machines) are considered internal and may change freely.
 *
 * The engine is pure TypeScript: no DOM, no React, no runtime dependencies.
 */

export * from './types';
export * from './document';
export * from './history';
export * from './renderer';
export * from './filters';
export * from './color';
export * from './geometry';
export * from './animation';
export * from './hotspots';
export * from './appExport';
export * from './projectFile';
export * from './svgExport';
export * from './dataPlot';
