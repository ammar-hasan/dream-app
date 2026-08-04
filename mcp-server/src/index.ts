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

const adjustmentProperties = {
  brightness: { type: 'number', minimum: -100, maximum: 100 },
  contrast: { type: 'number', minimum: -100, maximum: 100 },
  saturation: { type: 'number', minimum: -100, maximum: 100 },
  hue: { type: 'number', minimum: -180, maximum: 180 },
  grayscale: { type: 'number', minimum: 0, maximum: 100 },
  sepia: { type: 'number', minimum: 0, maximum: 100 },
  invert: { type: 'number', minimum: 0, maximum: 100 },
  blur: { type: 'number', minimum: 0, maximum: 20 },
  sharpen: { type: 'number', minimum: 0, maximum: 100 },
} as const;

const TOOLS: Tool[] = [
  {
    name: 'dream.read_project',
    description:
      'Read a .dream project file and return a summary: size, background, named project colors, mode, layer/frame counts, hotspots (incl. broken ones), operation counts per kind, game setup.',
    inputSchema: {
      type: 'object',
      properties: { path: string('Path to the .dream file') },
      required: ['path'],
    },
  },
  {
    name: 'dream.set_project_color',
    description:
      'Add a portable named color to a .dream project, or update and rename an existing one selected by id or exact name.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        color: optional(string('Existing project-color id or exact name; omit to add')),
        name: string('New non-empty name, at most 40 characters'),
        value: string('Color value, #rgb or #rrggbb'),
      },
      required: ['path', 'name', 'value'],
    },
  },
  {
    name: 'dream.remove_project_color',
    description: 'Remove a portable named color from a .dream project by id or exact name.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        color: string('Project-color id or exact name'),
      },
      required: ['path', 'color'],
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
      'List the layers of a .dream project (id, name, visibility, opacity, blend mode, editable adjustments, mask summary, lock, op count). Animated documents also get a per-frame breakdown.',
    inputSchema: {
      type: 'object',
      properties: { path: string('Path to the .dream file') },
      required: ['path'],
    },
  },
  {
    name: 'dream.add_layer',
    description: 'Add a new top layer to the active frame of a .dream project.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        name: optional(string('Layer name (default: the next numbered layer)')),
      },
      required: ['path'],
    },
  },
  {
    name: 'dream.update_layer',
    description:
      'Rename, show/hide, set opacity/blend mode/editable adjustments, manage its mask, lock/unlock or reorder a layer in the active frame of a .dream project.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        layer: string('Target layer id or name'),
        name: optional(string('New non-empty layer name')),
        visible: optional({ type: 'boolean', description: 'Whether the layer is visible' }),
        opacity: optional({
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Layer opacity from 0 to 1',
        }),
        blendMode: optional({
          type: 'string',
          enum: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'],
          description: 'How the flattened layer combines with artwork below',
        }),
        adjustments: optional({
          type: 'object',
          properties: adjustmentProperties,
          additionalProperties: false,
          minProperties: 1,
          description: 'Partial editable layer adjustment settings',
        }),
        mask: optional({
          type: 'string',
          enum: ['add', 'enable', 'disable', 'delete'],
          description: 'Add, enable, disable or delete the editable opacity mask',
        }),
        locked: optional({ type: 'boolean', description: 'Whether the layer is locked' }),
        index: optional({
          type: 'integer',
          minimum: 0,
          description: 'New zero-based stack index; 0 is the bottom',
        }),
      },
      required: ['path', 'layer'],
    },
  },
  {
    name: 'dream.remove_layer',
    description:
      'Remove a layer by id or name from the active frame. Refuses to remove the last layer.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        layer: string('Target layer id or name'),
      },
      required: ['path', 'layer'],
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
    name: 'dream.add_stroke',
    description:
      'Add a brush, pencil or eraser freehand stroke to a layer of a .dream project (default: top layer of the active frame).',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        points: {
          type: 'array',
          minItems: 2,
          maxItems: 10000,
          description: 'Ordered freehand samples in document pixels',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'X coordinate in document pixels' },
              y: { type: 'number', description: 'Y coordinate in document pixels' },
              pressure: optional({
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Optional stylus pressure from 0 to 1',
              }),
            },
            required: ['x', 'y'],
          },
        },
        tool: optional({
          type: 'string',
          enum: ['brush', 'pencil', 'eraser'],
          description: 'Freehand tool (default brush)',
        }),
        color: optional(string('Stroke color, #rgb or #rrggbb (default #1f2937)')),
        size: optional({
          type: 'number',
          exclusiveMinimum: 0,
          maximum: 8192,
          description: 'Stroke width in document pixels (default 8)',
        }),
        opacity: optional({
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Brush opacity from 0 to 1 (default 1)',
        }),
        layer: optional(string('Target layer id or name (default: top layer)')),
      },
      required: ['path', 'points'],
    },
  },
  {
    name: 'dream.add_mask_stroke',
    description:
      'Add an editable hide/reveal brush gesture to a layer opacity mask (default: top layer of the active frame). Creates and enables the mask when needed.',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        points: {
          type: 'array',
          minItems: 2,
          maxItems: 10000,
          description: 'Ordered mask-brush samples in document pixels',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'X coordinate in document pixels' },
              y: { type: 'number', description: 'Y coordinate in document pixels' },
              pressure: optional({
                type: 'number',
                minimum: 0,
                maximum: 1,
                description: 'Optional stylus pressure from 0 to 1',
              }),
            },
            required: ['x', 'y'],
          },
        },
        mode: optional({
          type: 'string',
          enum: ['hide', 'reveal'],
          description: 'Hide artwork or reveal it again (default hide)',
        }),
        size: optional({
          type: 'number',
          exclusiveMinimum: 0,
          maximum: 8192,
          description: 'Mask brush width in document pixels (default 8)',
        }),
        opacity: optional({
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Mask brush strength from 0 to 1 (default 1)',
        }),
        layer: optional(string('Target layer id or name (default: top layer)')),
      },
      required: ['path', 'points'],
    },
  },
  {
    name: 'dream.add_shape',
    description:
      'Add a line, rectangle or ellipse to a layer of a .dream project (default: top layer of the active frame).',
    inputSchema: {
      type: 'object',
      properties: {
        path: string('Path to the .dream file'),
        shape: {
          type: 'string',
          enum: ['line', 'rectangle', 'ellipse'],
          description: 'Shape kind',
        },
        x1: { type: 'number', description: 'Start X coordinate in document pixels' },
        y1: { type: 'number', description: 'Start Y coordinate in document pixels' },
        x2: { type: 'number', description: 'End X coordinate in document pixels' },
        y2: { type: 'number', description: 'End Y coordinate in document pixels' },
        size: optional({
          type: 'number',
          exclusiveMinimum: 0,
          description: 'Outline width in pixels (default 2)',
        }),
        color: optional(string('Shape color, #rgb or #rrggbb (default #000000)')),
        opacity: optional({
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Opacity from 0 to 1 (default 1)',
        }),
        fill: optional({
          type: 'boolean',
          description: 'Fill rectangles/ellipses instead of outlining them (default false)',
        }),
        layer: optional(string('Target layer id or name (default: top layer)')),
      },
      required: ['path', 'shape', 'x1', 'y1', 'x2', 'y2'],
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
  'dream.set_project_color': z.object({
    path: z.string(),
    color: z.string().optional(),
    name: z.string(),
    value: z.string(),
  }),
  'dream.remove_project_color': z.object({ path: z.string(), color: z.string() }),
  'dream.create_project': z.object({
    path: z.string(),
    width: z.number(),
    height: z.number(),
    background: z.string().optional(),
    name: z.string().optional(),
  }),
  'dream.list_layers': z.object({ path: z.string() }),
  'dream.add_layer': z.object({ path: z.string(), name: z.string().optional() }),
  'dream.update_layer': z.object({
    path: z.string(),
    layer: z.string(),
    name: z.string().optional(),
    visible: z.boolean().optional(),
    opacity: z.number().optional(),
    blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten']).optional(),
    adjustments: z
      .object({
        brightness: z.number().finite().min(-100).max(100).optional(),
        contrast: z.number().finite().min(-100).max(100).optional(),
        saturation: z.number().finite().min(-100).max(100).optional(),
        hue: z.number().finite().min(-180).max(180).optional(),
        grayscale: z.number().finite().min(0).max(100).optional(),
        sepia: z.number().finite().min(0).max(100).optional(),
        invert: z.number().finite().min(0).max(100).optional(),
        blur: z.number().finite().min(0).max(20).optional(),
        sharpen: z.number().finite().min(0).max(100).optional(),
      })
      .strict()
      .refine((value) => Object.keys(value).length > 0, 'at least one adjustment is required')
      .optional(),
    mask: z.enum(['add', 'enable', 'disable', 'delete']).optional(),
    locked: z.boolean().optional(),
    index: z.number().optional(),
  }),
  'dream.remove_layer': z.object({ path: z.string(), layer: z.string() }),
  'dream.add_stroke': z.object({
    path: z.string(),
    points: z
      .array(
        z.object({
          x: z.number().finite(),
          y: z.number().finite(),
          pressure: z.number().finite().min(0).max(1).optional(),
        }),
      )
      .min(2)
      .max(10000),
    tool: z.enum(['brush', 'pencil', 'eraser']).optional(),
    color: z.string().optional(),
    size: z.number().finite().positive().max(8192).optional(),
    opacity: z.number().finite().min(0).max(1).optional(),
    layer: z.string().optional(),
  }),
  'dream.add_mask_stroke': z.object({
    path: z.string(),
    points: z
      .array(
        z.object({
          x: z.number().finite(),
          y: z.number().finite(),
          pressure: z.number().finite().min(0).max(1).optional(),
        }),
      )
      .min(2)
      .max(10000),
    mode: z.enum(['hide', 'reveal']).optional(),
    size: z.number().finite().positive().max(8192).optional(),
    opacity: z.number().finite().min(0).max(1).optional(),
    layer: z.string().optional(),
  }),
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
  'dream.add_shape': z.object({
    path: z.string(),
    shape: z.enum(['line', 'rectangle', 'ellipse']),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    size: z.number().optional(),
    color: z.string().optional(),
    opacity: z.number().optional(),
    fill: z.boolean().optional(),
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
    case 'dream.set_project_color': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.setProjectColor(path, options));
    }
    case 'dream.remove_project_color': {
      const { path, color } = argsSchema[name].parse(args);
      return asJson(await tools.removeProjectColor(path, color));
    }
    case 'dream.create_project': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.createProject(path, options));
    }
    case 'dream.list_layers': {
      const { path } = argsSchema[name].parse(args);
      return asJson(await tools.listLayers(path));
    }
    case 'dream.add_layer': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.addLayer(path, options));
    }
    case 'dream.update_layer': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.updateLayer(path, options));
    }
    case 'dream.remove_layer': {
      const { path, layer } = argsSchema[name].parse(args);
      return asJson(await tools.removeLayer(path, layer));
    }
    case 'dream.add_stroke': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.addStroke(path, options));
    }
    case 'dream.add_mask_stroke': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.addMaskStroke(path, options));
    }
    case 'dream.add_text': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.addText(path, options));
    }
    case 'dream.add_shape': {
      const { path, ...options } = argsSchema[name].parse(args);
      return asJson(await tools.addShape(path, options));
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
