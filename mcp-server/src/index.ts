#!/usr/bin/env node
/**
 * dream-mcp — a stdio MCP server over Dream .dream project files.
 *
 * This file is deliberately thin: every tool maps 1:1 to a pure function in
 * tools.ts (plain args in, JSON-able result out), so all logic is unit-tested
 * without the MCP protocol. It uses the SDK's low-level Server with
 * hand-written JSON Schemas — transparent about the exact wire contract.
 *
 * Run with: node dist/mcp-server/src/index.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
  type CallToolResult,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as tools from './tools';

const string = (description: string) => ({ type: 'string', description });
const optional = (schema: object) => schema;

const TOOLS: Tool[] = [
  {
    name: 'dream.read_project',
    description:
      'Read a .dream project file and return a summary: size, background, mode, layer/frame counts, hotspots (incl. broken ones), operation counts per kind, game setup.',
    inputSchema: {
      type: 'object',
      properties: { path: string('Path to the .dream file') },
      required: ['path'],
    },
  },
  {
    name: 'dream.create_project',
    description: 'Create a new .dream project file with a blank layer.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Where to write the .dream file'),
        width: {
          type: 'integer',
          minimum: 1,
          maximum: 8192,
          description: 'Canvas width in pixels',
        },
        height: {
          type: 'integer',
          minimum: 1,
          maximum: 8192,
          description: 'Canvas height in pixels',
        },
        background: optional(string('Background color, #rgb or #rrggbb (default #ffffff)')),
        name: optional(string('Project name (default Untitled)')),
      },
      required: ['path', 'width', 'height'],
    },
  },
  {
    name: 'dream.list_layers',
    description:
      'List the layers of a .dream project (id, name, visibility, opacity, lock, op count). Animated documents also get a per-frame breakdown.',
    inputSchema: {
      type: 'object',
      properties: { path: string('Path to the .dream file') },
      required: ['path'],
    },
  },
  {
    name: 'dream.add_text',
    description:
      'Add a text operation to a layer of a .dream project (default: top layer of the active frame).',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        text: string('The text to place'),
        x: { type: 'number', description: 'Left edge, in document pixels' },
        y: { type: 'number', description: 'Top edge, in document pixels' },
        size: optional({
          type: 'number',
          exclusiveMinimum: 0,
          description: 'Font size in pixels (default 24)',
        }),
        color: optional(string('Text color, #rgb or #rrggbb (default #000000)')),
        fontFamily: optional(string('CSS font family (default sans-serif)')),
        layer: optional(string('Target layer id or name (default: top layer)')),
      },
      required: ['path', 'text', 'x', 'y'],
    },
  },
  {
    name: 'dream.render_png',
    description: 'Render a .dream project (or one animation frame) to a flattened PNG file.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        outPath: string('Where to write the PNG'),
        frame: optional({
          type: 'integer',
          minimum: 0,
          description: 'Frame index to render (animated documents); default: the active stack',
        }),
      },
      required: ['path', 'outPath'],
    },
  },
  {
    name: 'dream.export_app',
    description:
      'Export a .dream project as ONE self-contained interactive HTML prototype (frames as screens, hotspots as tappable links). Requires an animated document (frames).',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        outPath: string('Where to write the .html file'),
      },
      required: ['path', 'outPath'],
    },
  },
];

/** Runtime arg validation (the JSON Schemas above are the wire contract). */
const argsSchema = {
  'dream.read_project': z.object({ path: z.string() }),
  'dream.create_project': z.object({
    path: z.string(),
    width: z.number(),
    height: z.number(),
    background: z.string().optional(),
    name: z.string().optional(),
  }),
  'dream.list_layers': z.object({ path: z.string() }),
  'dream.add_text': z.object({
    path: z.string(),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    size: z.number().optional(),
    color: z.string().optional(),
    fontFamily: z.string().optional(),
    layer: z.string().optional(),
  }),
  'dream.render_png': z.object({
    path: z.string(),
    outPath: z.string(),
    frame: z.number().optional(),
  }),
  'dream.export_app': z.object({ path: z.string(), outPath: z.string() }),
} as const;

type ToolName = keyof typeof argsSchema;

const asJson = (value: unknown): CallToolResult => ({
  content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
});

async function callTool(name: ToolName, args: unknown): Promise<CallToolResult> {
  switch (name) {
    case 'dream.read_project': {
      const { path } = argsSchema[name].parse(args);
      return asJson(await tools.readProject(path));
    }
    case 'dream.create_project': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.createProject(path, options));
    }
    case 'dream.list_layers': {
      const { path } = argsSchema[name].parse(args);
      return asJson(await tools.listLayers(path));
    }
    case 'dream.add_text': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.addText(path, options));
    }
    case 'dream.render_png': {
      const { path, outPath, frame } = argsSchema[name].parse(args);
      return asJson(await tools.renderPng(path, outPath, { frame }));
    }
    case 'dream.export_app': {
      const { path, outPath } = argsSchema[name].parse(args);
      return asJson(await tools.exportApp(path, outPath));
    }
  }
}

const server = new Server({ name: 'dream-mcp', version: '0.1.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  if (!(name in argsSchema)) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  try {
    return await callTool(name as ToolName, request.params.arguments ?? {});
  } catch (error) {
    // Tool-level failures come back as error content, not protocol errors,
    // so the agent can read and recover from them.
    return {
      isError: true,
      content: [
        { type: 'text' as const, text: error instanceof Error ? error.message : String(error) },
      ],
    };
  }
});

async function main() {
  await server.connect(new StdioServerTransport());
  console.error('dream-mcp: listening on stdio');
}

main().catch((error) => {
  console.error('dream-mcp: fatal', error);
  process.exit(1);
});
