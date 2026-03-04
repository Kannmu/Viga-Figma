type RpcRequest = {
  type: "rpc-request";
  requestId: string;
  action: string;
  payload?: unknown;
};

type PersistedSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  provider: string;
};

type ToolRequestPayload = {
  name: string;
  arguments: Record<string, unknown>;
};

type VfAction = {
  type: string;
  [key: string]: unknown;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type NodeSummary = {
  nodeId: string;
  nodeType: SceneNode["type"];
  name: string;
  bounds: Bounds | null;
};

type VfdslNode = {
  tag: string;
  attrs: Record<string, string>;
  children: VfdslNode[];
  text: string;
};

type ParsedColor = {
  color: RGB;
  opacity?: number;
};

type RuntimeLogEntry = {
  source: "plugin";
  seq: number;
  timestamp: string;
  timestampMs: number;
  event: string;
  detail: unknown;
};

const SETTINGS_KEY = "viga.settings.v1";
const MAX_RUNTIME_LOG_ENTRIES = 5000;

let pluginLogSeq = 0;
const pluginRuntimeLog: RuntimeLogEntry[] = [];

figma.showUI(__html__, { width: 440, height: 720, themeColors: true });
logPluginEvent("plugin.ui.shown", { width: 440, height: 720, themeColors: true });

figma.on("selectionchange", () => {
  logPluginEvent("figma.selectionchange", {
    pageId: figma.currentPage.id,
    selectionCount: figma.currentPage.selection.length
  });
  void postSelectionEvent();
});

figma.ui.onmessage = (msg: unknown) => {
  void onUiMessage(msg);
};

async function onUiMessage(msg: unknown): Promise<void> {
  if (!isRpcRequest(msg)) {
    logPluginEvent("rpc.invalid-message", { receivedType: typeof msg });
    return;
  }

  logPluginEvent("rpc.request.received", {
    requestId: msg.requestId,
    action: msg.action,
    payload: msg.payload
  });

  try {
    const data = await handleRpc(msg.action, msg.payload);
    logPluginEvent("rpc.request.succeeded", {
      requestId: msg.requestId,
      action: msg.action,
      response: summarizeForLog(data)
    });
    figma.ui.postMessage({
      type: "rpc-response",
      requestId: msg.requestId,
      ok: true,
      data
    });
  } catch (error) {
    const err = formatPluginError(error, msg.action);
    logPluginEvent("rpc.request.failed", {
      requestId: msg.requestId,
      action: msg.action,
      error: err
    });
    figma.ui.postMessage({
      type: "rpc-response",
      requestId: msg.requestId,
      ok: false,
      error: err
    });
  }
}

function formatPluginError(error: unknown, action: string): string {
  if (error instanceof Error) {
    const stackLine = typeof error.stack === "string" ? error.stack.split("\n")[1]?.trim() ?? "" : "";
    return stackLine
      ? `[${action}] ${error.message} (${stackLine})`
      : `[${action}] ${error.message}`;
  }
  return `[${action}] Unknown plugin error`;
}

function isRpcRequest(msg: unknown): msg is RpcRequest {
  if (!msg || typeof msg !== "object") {
    return false;
  }

  const maybe = msg as Partial<RpcRequest>;
  return maybe.type === "rpc-request" && typeof maybe.requestId === "string" && typeof maybe.action === "string";
}

async function handleRpc(action: string, payload: unknown): Promise<unknown> {
  if (action === "bootstrap") {
    return {
      settings: await loadSettings(),
      selection: getSelectionContext()
    };
  }

  if (action === "save-settings") {
    const safe = sanitizeSettings(payload);
    await figma.clientStorage.setAsync(SETTINGS_KEY, safe);
    return { success: true };
  }

  if (action === "get-selection-context") {
    return getSelectionContext();
  }

  if (action === "execute-tool") {
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid tool payload.");
    }
    const typed = payload as ToolRequestPayload;
    return executeTool(typed.name, typed.arguments ?? {});
  }

  if (action === "resize-ui") {
    const p = payload as { width?: number; height?: number };
    const width = clampInt(p.width, 360, 720, 440);
    const height = clampInt(p.height, 420, 1200, 720);
    figma.ui.resize(width, height);
    return { width, height };
  }

  if (action === "notify") {
    const p = payload as { message?: string; error?: boolean };
    if (p?.message) {
      figma.notify(p.message, { error: Boolean(p.error) });
    }
    return { success: true };
  }

  if (action === "get-runtime-log") {
    return {
      source: "plugin",
      exportedAt: new Date().toISOString(),
      entries: pluginRuntimeLog
    };
  }

  throw new Error(`Unsupported action: ${action}`);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  const intValue = Math.round(value);
  return Math.max(min, Math.min(max, intValue));
}

async function loadSettings(): Promise<PersistedSettings> {
  const raw = await figma.clientStorage.getAsync(SETTINGS_KEY);
  return sanitizeSettings(raw);
}

function sanitizeSettings(raw: unknown): PersistedSettings {
  const input = raw && typeof raw === "object" ? (raw as Partial<PersistedSettings>) : {};
  return {
    baseUrl: typeof input.baseUrl === "string" && input.baseUrl.trim() ? input.baseUrl.trim() : "https://api.openai.com/v1",
    apiKey: typeof input.apiKey === "string" ? input.apiKey.trim() : "",
    model: typeof input.model === "string" && input.model.trim() ? input.model.trim() : "gpt-5.2",
    systemPrompt:
      typeof input.systemPrompt === "string" && input.systemPrompt.trim()
        ? input.systemPrompt
        : "You are Viga, an expert Figma design agent. Prefer using provided tools to inspect and edit the document safely.",
    temperature: typeof input.temperature === "number" && Number.isFinite(input.temperature) ? Math.max(0, Math.min(2, input.temperature)) : 0.4,
    provider: typeof input.provider === "string" && input.provider.trim() ? input.provider.trim() : "openai"
  };
}

async function postSelectionEvent(): Promise<void> {
  const context = getSelectionContext();
  logPluginEvent("selection.context.posted", {
    pageId: context.pageId,
    pageName: context.pageName,
    selectionCount: context.selectionCount,
    selectedNodeIds: context.selectedNodeIds
  });
  figma.ui.postMessage({
    type: "event",
    event: "selection-changed",
    payload: context
  });
}

function getSelectionContext(): {
  pageId: string;
  pageName: string;
  selectionCount: number;
  selectedNodeIds: string[];
  selectedNodeSummaries: NodeSummary[];
  selectedNodesDsl: string;
  selectedBounds: Bounds[];
} {
  const selection = figma.currentPage.selection;
  const dsl =
    selection.length > 0
      ? compactSelectionDsl(
          selection
            .slice(0, 8)
            .map((node) => nodeToVfDsl(node, 2, 0))
            .join("\n")
        )
      : "";
  return {
    pageId: figma.currentPage.id,
    pageName: figma.currentPage.name,
    selectionCount: selection.length,
    selectedNodeIds: selection.map((node) => node.id),
    selectedNodeSummaries: selection.slice(0, 20).map((node) => ({
      nodeId: node.id,
      nodeType: node.type,
      name: node.name,
      bounds: getNodeBounds(node)
    })),
    selectedNodesDsl: dsl,
    selectedBounds: selection
      .map((node) => ({ nodeId: node.id, bounds: getNodeBounds(node) }))
      .filter((item): item is { nodeId: string; bounds: Bounds } => Boolean(item.bounds))
      .map((item) => item.bounds)
  };
}

function compactSelectionDsl(source: string): string {
  const maxLines = 220;
  const maxChars = 6500;
  const lines = source.split("\n");
  const clippedLines = lines.slice(0, maxLines);
  let clipped = clippedLines.join("\n");
  if (clipped.length > maxChars) {
    clipped = `${clipped.slice(0, maxChars)}\n<!-- selection DSL truncated -->`;
  } else if (lines.length > maxLines) {
    clipped += "\n<!-- selection DSL truncated -->";
  }
  return clipped;
}

async function resolveInsertionContext(parentId: string): Promise<{
  parent: (BaseNode & ChildrenMixin) | null;
  anchorBounds: Bounds | null;
}> {
  if (parentId) {
    const target = await figma.getNodeByIdAsync(parentId);
    if (!target) {
      return { parent: null, anchorBounds: null };
    }
    if ("appendChild" in target) {
      return {
        parent: target as BaseNode & ChildrenMixin,
        anchorBounds: getNodeBounds(target)
      };
    }

    const fallbackParent = "parent" in target ? target.parent : null;
    if (fallbackParent && "appendChild" in fallbackParent) {
      return {
        parent: fallbackParent as BaseNode & ChildrenMixin,
        anchorBounds: getNodeBounds(target)
      };
    }

    return {
      parent: figma.currentPage,
      anchorBounds: getNodeBounds(target)
    };
  }

  const selected = figma.currentPage.selection[0];
  if (selected && "appendChild" in selected) {
    return {
      parent: selected as BaseNode & ChildrenMixin,
      anchorBounds: getNodeBounds(selected)
    };
  }

  if (selected) {
    const selectedParent = selected.parent;
    if (selectedParent && "appendChild" in selectedParent) {
      return {
        parent: selectedParent as BaseNode & ChildrenMixin,
        anchorBounds: getNodeBounds(selected)
      };
    }
  }

  return {
    parent: figma.currentPage,
    anchorBounds: selected ? getNodeBounds(selected) : null
  };
}

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const startedAt = Date.now();
  logPluginEvent("tool.execute.start", { name, args });
  try {
    let result: unknown;

    if (name === "get_current_selection") {
      result = getSelectionContext();
    } else if (name === "inspect_node_tree") {
      const nodeId = asString(args.node_id);
      if (!nodeId) {
        throw new Error("inspect_node_tree requires node_id.");
      }
      const depth = Math.max(1, Math.min(8, Math.round(asNumber(args.depth, 3))));
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!isSceneNode(node)) {
        throw new Error(`Node not found or unsupported: ${nodeId}`);
      }
      result = {
        nodeId,
        depth,
        dsl: nodeToVfDsl(node, depth, 0)
      };
    } else if (name === "get_visual_snapshot") {
      const targetId = asString(args.node_id);
      const node = targetId ? await figma.getNodeByIdAsync(targetId) : figma.currentPage.selection[0] ?? null;
      if (!node) {
        throw new Error("No node selected for snapshot.");
      }
      if (!isExportable(node)) {
        throw new Error("Target node cannot be exported.");
      }
      const bytes = await node.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
      result = {
        nodeId: node.id,
        mimeType: "image/png",
        bytes
      };
    } else if (name === "generate_design_from_dsl") {
      const dsl = asString(args.dsl_string);
      const parentId = asString(args.parent_id);
      if (!dsl) {
        throw new Error("generate_design_from_dsl requires dsl_string.");
      }
      const parsed = parseVfDsl(dsl);
      const context = await resolveInsertionContext(parentId);
      const parent = context.parent;
      if (!parent) {
        throw new Error("Parent node does not support children.");
      }

      const hasExplicitPosition = parsed.children.some((node) => hasExplicitCoordinates(node));

      const created: SceneNode[] = [];
      for (const node of parsed.children) {
        const createdNode = await buildNodeFromDsl(node, parent);
        if (createdNode) {
          created.push(createdNode);
        }
      }

      if (created.length > 0 && !hasExplicitPosition && context.anchorBounds) {
        centerCreatedNodesOnAnchor(created, context.anchorBounds);
      }

      if (created.length > 0) {
        figma.currentPage.selection = created;
        figma.viewport.scrollAndZoomIntoView(created);
        figma.commitUndo();
      }

      result = {
        createdNodeIds: created.map((node) => node.id),
        createdCount: created.length
      };
    } else if (name === "update_node_properties") {
      const nodeId = asString(args.node_id);
      const properties = (args.properties as Record<string, unknown>) ?? {};
      if (!nodeId) {
        throw new Error("update_node_properties requires node_id.");
      }
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!isSceneNode(node)) {
        throw new Error(`Node not found: ${nodeId}`);
      }

      await applyProperties(node, properties);
      figma.commitUndo();
      result = { success: true, nodeId };
    } else if (name === "execute_vf_actions") {
      const actions = Array.isArray(args.actions) ? (args.actions as VfAction[]) : [];
      if (actions.length === 0) {
        throw new Error("execute_vf_actions requires a non-empty actions array.");
      }
      result = await executeVfActions(actions, {
        selectResult: args.select_result !== false
      });
    } else if (name === "delete_nodes") {
      const nodeIds = Array.isArray(args.node_ids) ? args.node_ids.map((x) => String(x)) : [];
      if (nodeIds.length === 0) {
        throw new Error("delete_nodes requires node_ids.");
      }
      let deleted = 0;
      for (const id of nodeIds) {
        const node = await figma.getNodeByIdAsync(id);
        if (isSceneNode(node) && !node.removed) {
          node.remove();
          deleted += 1;
        }
      }
      if (deleted > 0) {
        figma.commitUndo();
      }
      result = { deleted };
    } else if (name === "focus_and_zoom_to_node") {
      const nodeId = asString(args.node_id);
      if (!nodeId) {
        throw new Error("focus_and_zoom_to_node requires node_id.");
      }
      const node = await figma.getNodeByIdAsync(nodeId);
      if (!isSceneNode(node)) {
        throw new Error(`Node not found: ${nodeId}`);
      }
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
      result = { success: true };
    } else if (name === "ask_user_for_clarification") {
      const prompt = asString(args.prompt) || "Please clarify your instruction.";
      figma.ui.postMessage({
        type: "event",
        event: "clarification-request",
        payload: { prompt }
      });
      result = { delivered: true };
    } else {
      throw new Error(`Unsupported tool: ${name}`);
    }

    logPluginEvent("tool.execute.done", {
      name,
      durationMs: Date.now() - startedAt,
      result: summarizeForLog(result)
    });
    return result;
  } catch (error) {
    logPluginEvent("tool.execute.failed", {
      name,
      durationMs: Date.now() - startedAt,
      error
    });
    throw error;
  }
}

function logPluginEvent(event: string, detail?: unknown): void {
  const timestampMs = Date.now();
  const entry: RuntimeLogEntry = {
    source: "plugin",
    seq: ++pluginLogSeq,
    timestamp: new Date(timestampMs).toISOString(),
    timestampMs,
    event,
    detail: sanitizeForLog(detail)
  };

  pluginRuntimeLog.push(entry);
  if (pluginRuntimeLog.length > MAX_RUNTIME_LOG_ENTRIES) {
    pluginRuntimeLog.splice(0, pluginRuntimeLog.length - MAX_RUNTIME_LOG_ENTRIES);
  }

  figma.ui.postMessage({
    type: "event",
    event: "runtime-log-entry",
    payload: entry
  });
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) {
    return "[depth-truncated]";
  }
  if (value == null) {
    return value;
  }
  if (typeof value === "string") {
    if (value.length > 2000) {
      return `${value.slice(0, 2000)}...[truncated ${value.length - 2000} chars]`;
    }
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Uint8Array) {
    return { type: "Uint8Array", length: value.length };
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: typeof value.stack === "string" ? value.stack.split("\n").slice(0, 8) : []
    };
  }
  if (Array.isArray(value)) {
    const capped = value.slice(0, 40).map((item) => sanitizeForLog(item, depth + 1));
    if (value.length > 40) {
      capped.push(`[truncated ${value.length - 40} items]`);
    }
    return capped;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    const result: Record<string, unknown> = {};
    const cappedKeys = keys.slice(0, 60);
    for (const key of cappedKeys) {
      if (isSensitiveKey(key)) {
        result[key] = "[REDACTED]";
      } else {
        result[key] = sanitizeForLog(obj[key], depth + 1);
      }
    }
    if (keys.length > 60) {
      result.__truncatedKeys = keys.length - 60;
    }
    return result;
  }
  return String(value);
}

function isSensitiveKey(key: string): boolean {
  return /api[_-]?key|authorization|token|secret|password/i.test(key);
}

function summarizeForLog(value: unknown): unknown {
  if (value && typeof value === "object" && "bytes" in (value as Record<string, unknown>)) {
    const objectValue = value as Record<string, unknown>;
    const bytes = objectValue.bytes;
    const length = bytes instanceof Uint8Array ? bytes.length : Array.isArray(bytes) ? bytes.length : 0;
    const rest: Record<string, unknown> = { ...objectValue, bytes: { type: "binary", length } };
    return sanitizeForLog(rest);
  }
  return sanitizeForLog(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

function isSceneNode(node: BaseNode | null): node is SceneNode {
  return Boolean(node && "visible" in node);
}

function isExportable(node: BaseNode): node is BaseNode & ExportMixin {
  return "exportAsync" in node;
}

function getNodeBounds(node: BaseNode | null): Bounds | null {
  if (!node || !("x" in node) || !("y" in node) || !("width" in node) || !("height" in node)) {
    return null;
  }
  const candidate = node as SceneNode;
  if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y) || !Number.isFinite(candidate.width) || !Number.isFinite(candidate.height)) {
    return null;
  }
  return {
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height
  };
}

function hasExplicitCoordinates(node: VfdslNode): boolean {
  if (typeof node.attrs.x === "string" || typeof node.attrs.y === "string") {
    return true;
  }
  for (const child of node.children) {
    if (hasExplicitCoordinates(child)) {
      return true;
    }
  }
  return false;
}

function getNodesUnionBounds(nodes: SceneNode[]): Bounds | null {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const bounds = getNodeBounds(node);
    if (!bounds) {
      continue;
    }
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

function centerCreatedNodesOnAnchor(created: SceneNode[], anchor: Bounds): void {
  const groupBounds = getNodesUnionBounds(created);
  if (!groupBounds) {
    return;
  }

  const targetCenterX = anchor.x + anchor.width / 2;
  const targetCenterY = anchor.y + anchor.height / 2;
  const currentCenterX = groupBounds.x + groupBounds.width / 2;
  const currentCenterY = groupBounds.y + groupBounds.height / 2;
  const deltaX = targetCenterX - currentCenterX;
  const deltaY = targetCenterY - currentCenterY;

  for (const node of created) {
    if ("x" in node && "y" in node) {
      node.x += deltaX;
      node.y += deltaY;
    }
  }
}

function nodeToVfDsl(node: SceneNode, depth: number, level: number): string {
  const indent = "  ".repeat(level);
  const tag = nodeTypeToTag(node.type);
  const attrs: Record<string, string> = {
    id: node.id,
    name: node.name
  };

  if ("x" in node) {
    attrs.x = round(node.x).toString();
  }
  if ("y" in node) {
    attrs.y = round(node.y).toString();
  }
  if ("x" in node && "y" in node) {
    attrs.pos = `${round(node.x)},${round(node.y)}`;
  }
  if ("width" in node) {
    attrs.width = round(node.width).toString();
  }
  if ("height" in node) {
    attrs.height = round(node.height).toString();
  }
  if ("width" in node && "height" in node) {
    attrs.size = `${round(node.width)}x${round(node.height)}`;
  }
  if ("opacity" in node) {
    attrs.opacity = round(node.opacity).toString();
  }
  if ("rotation" in node && Math.abs(node.rotation) > 0.01) {
    attrs.rotation = round(node.rotation).toString();
  }
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    attrs.layout = node.layoutMode === "HORIZONTAL" ? "horizontal" : "vertical";
    attrs.gap = String(node.itemSpacing);
    attrs.padding = `${node.paddingTop},${node.paddingRight},${node.paddingBottom},${node.paddingLeft}`;
    attrs.align = autoLayoutAlignToDsl(node.counterAxisAlignItems);
    attrs.justify = autoLayoutJustifyToDsl(node.primaryAxisAlignItems);
  }
  if ("layoutAlign" in node && node.layoutAlign !== "INHERIT") {
    attrs.alignSelf = node.layoutAlign.toLowerCase();
  }
  if ("layoutGrow" in node && node.layoutGrow > 0) {
    attrs.grow = String(node.layoutGrow);
  }
  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    attrs.radius = round(node.cornerRadius).toString();
  }
  if ("fills" in node) {
    const hex = extractSolidHex(node.fills);
    if (hex) {
      attrs.fill = hex;
    }
  }
  if ("strokes" in node) {
    const strokeHex = extractSolidHex(node.strokes);
    if (strokeHex) {
      attrs.stroke = strokeHex;
    }
  }
  if ("strokeWeight" in node && typeof node.strokeWeight === "number" && node.strokeWeight > 0) {
    attrs.strokeWidth = String(round(node.strokeWeight));
  }
  if (node.type === "TEXT") {
    attrs.fontSize = String(node.fontSize);
    if (node.fontName !== figma.mixed) {
      attrs.fontFamily = node.fontName.family;
      attrs.weight = node.fontName.style;
    }
  }

  const attrText = Object.entries(attrs)
    .filter((entry) => entry[1] !== "")
    .map(([key, value]) => `${key}="${escapeXml(value)}"`)
    .join(" ");

  const hasChildren = "children" in node && node.children.length > 0 && depth > 0;
  const hasText = node.type === "TEXT" && node.characters.trim().length > 0;

  if (!hasChildren && !hasText) {
    return `${indent}<${tag}${attrText ? ` ${attrText}` : ""} />`;
  }

  const open = `${indent}<${tag}${attrText ? ` ${attrText}` : ""}>`;
  const lines: string[] = [open];

  if (hasText) {
    lines.push(`${indent}  ${escapeXml(node.characters)}`);
  }

  if (hasChildren && "children" in node) {
    for (const child of node.children) {
      lines.push(nodeToVfDsl(child, depth - 1, level + 1));
    }
  }

  lines.push(`${indent}</${tag}>`);
  return lines.join("\n");
}

function nodeTypeToTag(nodeType: SceneNode["type"]): string {
  if (nodeType === "FRAME") return "Frame";
  if (nodeType === "TEXT") return "Text";
  if (nodeType === "RECTANGLE") return "Rectangle";
  if (nodeType === "ELLIPSE") return "Ellipse";
  if (nodeType === "LINE") return "Line";
  return "Frame";
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractSolidHex(fills: ReadonlyArray<Paint> | PluginAPI["mixed"]): string {
  if (fills === figma.mixed || fills.length === 0) {
    return "";
  }
  const first = fills[0];
  if (first.type !== "SOLID") {
    return "";
  }
  return rgbToHex(first.color);
}

function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(color.g * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(color.b * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

function parseHexColor(hex: string): RGB | null {
  const parsed = parseColor(hex);
  return parsed ? parsed.color : null;
}

function parseColor(value: string): ParsedColor | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const hexMatch = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
  if (hexMatch) {
    const source = hexMatch[1];
    if (source.length === 3 || source.length === 4) {
      const r = parseInt(source[0] + source[0], 16) / 255;
      const g = parseInt(source[1] + source[1], 16) / 255;
      const b = parseInt(source[2] + source[2], 16) / 255;
      if (source.length === 4) {
        const a = parseInt(source[3] + source[3], 16) / 255;
        return { color: { r, g, b }, opacity: clamp01(a) };
      }
      return { color: { r, g, b } };
    }

    const r = parseInt(source.slice(0, 2), 16) / 255;
    const g = parseInt(source.slice(2, 4), 16) / 255;
    const b = parseInt(source.slice(4, 6), 16) / 255;
    if (source.length === 8) {
      const a = parseInt(source.slice(6, 8), 16) / 255;
      return { color: { r, g, b }, opacity: clamp01(a) };
    }
    return { color: { r, g, b } };
  }

  const rgbMatch = trimmed.match(/^rgba?\((.+)\)$/i);
  if (rgbMatch) {
    const parts = splitTopLevel(rgbMatch[1], ",").map((part) => part.trim());
    if (parts.length !== 3 && parts.length !== 4) {
      return null;
    }

    const r = parseRgbChannel(parts[0]);
    const g = parseRgbChannel(parts[1]);
    const b = parseRgbChannel(parts[2]);
    if (r == null || g == null || b == null) {
      return null;
    }

    if (parts.length === 4) {
      const a = parseAlphaChannel(parts[3]);
      if (a == null) {
        return null;
      }
      return { color: { r, g, b }, opacity: clamp01(a) };
    }

    return { color: { r, g, b } };
  }

  return null;
}

function parsePaints(value: string): Paint[] | null {
  const gradientPaint = parseGradientPaint(value);
  if (gradientPaint) {
    return [gradientPaint];
  }

  const parsed = parseColor(value);
  if (!parsed) {
    return null;
  }

  const solid: SolidPaint = {
    type: "SOLID",
    color: parsed.color,
    ...(typeof parsed.opacity === "number" ? { opacity: parsed.opacity } : {})
  };
  return [solid];
}

function parseGradientPaint(value: string): GradientPaint | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const linearMatch = trimmed.match(/^linear-gradient\((.+)\)$/i);
  if (linearMatch) {
    const parts = splitTopLevel(linearMatch[1], ",").map((part) => part.trim()).filter(Boolean);
    if (parts.length < 2) {
      return null;
    }

    let angle = 180;
    let stopParts = parts;
    const parsedDirection = parseGradientDirection(parts[0]);
    if (parsedDirection != null && parts.length >= 3) {
      angle = parsedDirection;
      stopParts = parts.slice(1);
    }

    const stops = parseGradientStops(stopParts);
    if (!stops) {
      return null;
    }

    return {
      type: "GRADIENT_LINEAR",
      gradientStops: stops,
      gradientTransform: buildLinearGradientTransform(angle)
    };
  }

  const radialMatch = trimmed.match(/^radial-gradient\((.+)\)$/i);
  if (radialMatch) {
    const parts = splitTopLevel(radialMatch[1], ",").map((part) => part.trim()).filter(Boolean);
    const stops = parseGradientStops(parts);
    if (!stops) {
      return null;
    }

    return {
      type: "GRADIENT_RADIAL",
      gradientStops: stops,
      gradientTransform: [
        [0.5, 0, 0.25],
        [0, 0.5, 0.25]
      ]
    };
  }

  return null;
}

function splitTopLevel(value: string, delimiter: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }
    if (char === delimiter && depth === 0) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current) {
    result.push(current);
  }
  return result;
}

function parseRgbChannel(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const n = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(n)) {
      return null;
    }
    return clamp01(n / 100);
  }

  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return null;
  }
  return clamp01(n / 255);
}

function parseAlphaChannel(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.endsWith("%")) {
    const n = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(n)) {
      return null;
    }
    return clamp01(n / 100);
  }

  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return null;
  }
  return clamp01(n);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function parseGradientDirection(value: string): number | null {
  const lower = value.trim().toLowerCase();
  const degMatch = lower.match(/^(-?\d+(?:\.\d+)?)deg$/);
  if (degMatch) {
    return Number(degMatch[1]);
  }

  if (!lower.startsWith("to ")) {
    return null;
  }

  const direction = lower.slice(3).replace(/\s+/g, " ").trim();
  const map: Record<string, number> = {
    top: 0,
    "top right": 45,
    right: 90,
    "bottom right": 135,
    bottom: 180,
    "bottom left": 225,
    left: 270,
    "top left": 315
  };
  return direction in map ? map[direction] : null;
}

function parseGradientStops(tokens: string[]): ColorStop[] | null {
  if (tokens.length < 2) {
    return null;
  }

  const rawStops: Array<{ color: RGBA; position?: number }> = [];
  for (const token of tokens) {
    const parsedStop = parseGradientStop(token);
    if (!parsedStop) {
      return null;
    }
    rawStops.push(parsedStop);
  }

  const count = rawStops.length;
  const fallbackPositions = rawStops.map((_item, index) => (count === 1 ? 0 : index / (count - 1)));
  const normalized: ColorStop[] = rawStops.map((item, index) => ({
    color: item.color,
    position: clamp01(typeof item.position === "number" ? item.position : fallbackPositions[index])
  }));

  normalized.sort((a, b) => a.position - b.position);

  return normalized;
}

function parseGradientStop(token: string): { color: RGBA; position?: number } | null {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^(.*?)(?:\s+(-?\d+(?:\.\d+)?%?))?$/);
  if (!match) {
    return null;
  }

  const colorText = match[1].trim();
  const parsedColor = parseColor(colorText);
  if (!parsedColor) {
    return null;
  }

  const positionText = match[2]?.trim();
  let position: number | undefined;
  if (positionText) {
    if (positionText.endsWith("%")) {
      const n = Number(positionText.slice(0, -1));
      if (!Number.isFinite(n)) {
        return null;
      }
      position = n / 100;
    } else {
      const n = Number(positionText);
      if (!Number.isFinite(n)) {
        return null;
      }
      position = n;
    }
  }

  return {
    color: {
      ...parsedColor.color,
      a: typeof parsedColor.opacity === "number" ? parsedColor.opacity : 1
    },
    position
  };
}

function buildLinearGradientTransform(cssAngle: number): Transform {
  const angleRad = ((90 - cssAngle) * Math.PI) / 180;
  const dirX = Math.cos(angleRad);
  const dirY = Math.sin(angleRad);
  const startX = 0.5 - dirX * 0.5;
  const startY = 0.5 - dirY * 0.5;
  const endX = 0.5 + dirX * 0.5;
  const endY = 0.5 + dirY * 0.5;
  const perpX = -dirY;
  const perpY = dirX;
  const thirdX = startX + perpX;
  const thirdY = startY + perpY;

  return [
    [endX - startX, thirdX - startX, startX],
    [endY - startY, thirdY - startY, startY]
  ];
}

function autoLayoutAlignToDsl(value: AutoLayoutMixin["counterAxisAlignItems"]): string {
  if (value === "MIN") return "start";
  if (value === "MAX") return "end";
  return "center";
}

function autoLayoutJustifyToDsl(value: AutoLayoutMixin["primaryAxisAlignItems"]): string {
  if (value === "MIN") return "start";
  if (value === "MAX") return "end";
  if (value === "SPACE_BETWEEN") return "space-between";
  return "center";
}

function dslAlignToAutoLayout(value: string): AutoLayoutMixin["counterAxisAlignItems"] | null {
  const lower = value.trim().toLowerCase();
  if (lower === "start" || lower === "min") return "MIN";
  if (lower === "end" || lower === "max") return "MAX";
  if (lower === "center" || lower === "middle") return "CENTER";
  return null;
}

function dslJustifyToAutoLayout(value: string): AutoLayoutMixin["primaryAxisAlignItems"] | null {
  const lower = value.trim().toLowerCase();
  if (lower === "start" || lower === "min") return "MIN";
  if (lower === "end" || lower === "max") return "MAX";
  if (lower === "center" || lower === "middle") return "CENTER";
  if (lower === "space-between") return "SPACE_BETWEEN";
  return null;
}

function parseTuple(value: string, separator: string): number[] {
  return value
    .split(separator)
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));
}

function parseVfDsl(source: string): VfdslNode {
  const root: VfdslNode = { tag: "Root", attrs: {}, children: [], text: "" };
  const stack: VfdslNode[] = [root];
  const tokenRegex = /<[^>]+>|[^<]+/g;
  const tokens = source.match(tokenRegex) ?? [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith("<!--")) {
      continue;
    }

    if (trimmed.startsWith("</")) {
      if (stack.length > 1) {
        stack.pop();
      }
      continue;
    }

    if (trimmed.startsWith("<")) {
      const selfClosing = trimmed.endsWith("/>");
      const body = trimmed.slice(1, trimmed.length - (selfClosing ? 2 : 1)).trim();
      const tagMatch = body.match(/^([A-Za-z_][\w-]*)/);
      if (!tagMatch) {
        continue;
      }

      const tag = tagMatch[1];
      const attrs: Record<string, string> = {};
      const attrRegex = /([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let attrMatch = attrRegex.exec(body);
      while (attrMatch) {
        attrs[attrMatch[1]] = unescapeXml(attrMatch[2] ?? attrMatch[3] ?? "");
        attrMatch = attrRegex.exec(body);
      }

      const next: VfdslNode = { tag, attrs, children: [], text: "" };
      stack[stack.length - 1].children.push(next);
      if (!selfClosing) {
        stack.push(next);
      }
      continue;
    }

    stack[stack.length - 1].text += `${unescapeXml(token)}\n`;
  }

  return root;
}

async function buildNodeFromDsl(element: VfdslNode, parent: BaseNode & ChildrenMixin): Promise<SceneNode | null> {
  const node = await createNodeByTag(element);
  if (!node) {
    return null;
  }

  parent.appendChild(node);
  await applyAttributes(node, element.attrs);

  if (node.type === "TEXT") {
    const textContent = resolveDslTextContent(element);
    if (!textContent) {
      return node;
    }
    const fontName = node.fontName === figma.mixed ? { family: "Inter", style: "Regular" } : node.fontName;
    await figma.loadFontAsync(fontName);
    node.characters = textContent;
  }

  if ("children" in node) {
    for (const child of element.children) {
      await buildNodeFromDsl(child, node as BaseNode & ChildrenMixin);
    }
  }

  return node;
}

function resolveDslTextContent(element: VfdslNode): string {
  const childText = element.text.trim();
  if (childText) {
    return childText;
  }

  const fallback = element.attrs.text_content ?? element.attrs.text ?? element.attrs.characters;
  return typeof fallback === "string" ? fallback : "";
}

async function createNodeByTag(element: VfdslNode): Promise<SceneNode | null> {
  const tag = element.tag.toLowerCase();
  if (tag === "frame" || tag === "button") {
    return figma.createFrame();
  }
  if (tag === "rectangle") {
    return figma.createRectangle();
  }
  if (tag === "ellipse") {
    return figma.createEllipse();
  }
  if (tag === "line") {
    return figma.createLine();
  }
  if (tag === "text") {
    const node = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    return node;
  }
  return figma.createFrame();
}

async function applyAttributes(node: SceneNode, attrs: Record<string, string>): Promise<void> {
  if (attrs.name) {
    node.name = attrs.name;
  }

  if ("x" in node && "y" in node && attrs.pos) {
    const values = parseTuple(attrs.pos, ",");
    if (values.length === 2) {
      node.x = values[0];
      node.y = values[1];
    }
  }

  if ("x" in node && attrs.x) {
    node.x = Number(attrs.x);
  }
  if ("y" in node && attrs.y) {
    node.y = Number(attrs.y);
  }

  if ("resize" in node && attrs.size) {
    const parts = parseTuple(attrs.size.toLowerCase(), "x");
    if (parts.length === 2) {
      node.resize(Math.max(1, parts[0]), Math.max(1, parts[1]));
    }
  }

  if ("resize" in node) {
    const width = attrs.width ? Number(attrs.width) : node.width;
    const height = attrs.height ? Number(attrs.height) : node.height;
    if (Number.isFinite(width) && Number.isFinite(height)) {
      node.resize(Math.max(1, width), Math.max(1, height));
    }
  }
  if ("opacity" in node && attrs.opacity) {
    node.opacity = Math.max(0, Math.min(1, Number(attrs.opacity)));
  }

  if ("rotation" in node && attrs.rotation) {
    const rot = Number(attrs.rotation);
    if (Number.isFinite(rot)) {
      node.rotation = rot;
    }
  }

  if ("fills" in node && attrs.fill) {
    const paints = parsePaints(attrs.fill);
    if (paints) {
      node.fills = paints;
    }
  }

  if ("strokes" in node && attrs.stroke) {
    const paints = parsePaints(attrs.stroke);
    if (paints) {
      node.strokes = paints;
    }
  }

  if ("strokeWeight" in node && attrs.strokeWidth) {
    const strokeWidth = Number(attrs.strokeWidth);
    if (Number.isFinite(strokeWidth) && strokeWidth >= 0) {
      node.strokeWeight = strokeWidth;
    }
  }

  if ("topLeftRadius" in node && attrs.radius) {
    const radius = Number(attrs.radius);
    if (Number.isFinite(radius)) {
      node.topLeftRadius = radius;
      node.topRightRadius = radius;
      node.bottomRightRadius = radius;
      node.bottomLeftRadius = radius;
    }
  }

  if ("layoutMode" in node && attrs.layout) {
    const lower = attrs.layout.toLowerCase();
    if (lower === "horizontal") {
      node.layoutMode = "HORIZONTAL";
    } else if (lower === "vertical") {
      node.layoutMode = "VERTICAL";
    } else if (lower === "none") {
      node.layoutMode = "NONE";
    }
  }

  if ("counterAxisAlignItems" in node && attrs.align) {
    const parsedAlign = dslAlignToAutoLayout(attrs.align);
    if (parsedAlign) {
      node.counterAxisAlignItems = parsedAlign;
    }
  }

  if ("primaryAxisAlignItems" in node && attrs.justify) {
    const parsedJustify = dslJustifyToAutoLayout(attrs.justify);
    if (parsedJustify) {
      node.primaryAxisAlignItems = parsedJustify;
    }
  }

  if ("layoutAlign" in node && attrs.alignSelf) {
    const lower = attrs.alignSelf.toLowerCase();
    if (lower === "stretch") {
      node.layoutAlign = "STRETCH";
    } else if (lower === "center") {
      node.layoutAlign = "CENTER";
    } else if (lower === "min" || lower === "start") {
      node.layoutAlign = "MIN";
    } else if (lower === "max" || lower === "end") {
      node.layoutAlign = "MAX";
    }
  }

  if ("layoutGrow" in node && attrs.grow) {
    const grow = Number(attrs.grow);
    if (Number.isFinite(grow)) {
      node.layoutGrow = grow;
    }
  }

  if ("itemSpacing" in node && attrs.gap) {
    const value = Number(attrs.gap);
    if (Number.isFinite(value)) {
      node.itemSpacing = value;
    }
  }

  if ("paddingTop" in node && attrs.padding) {
    const parts = attrs.padding
      .split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isFinite(v));
    if (parts.length === 1) {
      node.paddingTop = parts[0];
      node.paddingRight = parts[0];
      node.paddingBottom = parts[0];
      node.paddingLeft = parts[0];
    } else if (parts.length === 2) {
      node.paddingTop = parts[0];
      node.paddingBottom = parts[0];
      node.paddingLeft = parts[1];
      node.paddingRight = parts[1];
    } else if (parts.length === 4) {
      node.paddingTop = parts[0];
      node.paddingRight = parts[1];
      node.paddingBottom = parts[2];
      node.paddingLeft = parts[3];
    }
  }

  if (node.type === "TEXT") {
    if (attrs.fontFamily || attrs.weight) {
      const next = {
        family: attrs.fontFamily || (node.fontName === figma.mixed ? "Inter" : node.fontName.family),
        style: attrs.weight || (node.fontName === figma.mixed ? "Regular" : node.fontName.style)
      };
      await figma.loadFontAsync(next);
      node.fontName = next;
    }
    if (attrs.fontSize) {
      const size = Number(attrs.fontSize);
      if (Number.isFinite(size)) {
        node.fontSize = size;
      }
    }

    if (attrs.textAlign) {
      const lower = attrs.textAlign.toLowerCase();
      if (lower === "left") {
        node.textAlignHorizontal = "LEFT";
      } else if (lower === "center" || lower === "middle") {
        node.textAlignHorizontal = "CENTER";
      } else if (lower === "right") {
        node.textAlignHorizontal = "RIGHT";
      } else if (lower === "justify") {
        node.textAlignHorizontal = "JUSTIFIED";
      }
    }

    if (attrs.lineHeight) {
      const parsedLineHeight = parseTextLineHeight(attrs.lineHeight);
      if (parsedLineHeight) {
        node.lineHeight = parsedLineHeight;
      }
    }

    if (attrs.letterSpacing) {
      const parsedSpacing = parseLetterSpacing(attrs.letterSpacing);
      if (parsedSpacing) {
        node.letterSpacing = parsedSpacing;
      }
    }

    if (attrs.color) {
      const paints = parsePaints(attrs.color);
      if (paints) {
        node.fills = paints;
      }
    }
  }
}

function parseTextLineHeight(value: string): LineHeight | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed === "auto" || trimmed === "normal") {
    return { unit: "AUTO" };
  }
  if (trimmed.endsWith("%")) {
    const n = Number(trimmed.slice(0, -1));
    if (Number.isFinite(n) && n > 0) {
      return { unit: "PERCENT", value: n };
    }
    return null;
  }
  const n = Number(trimmed);
  if (Number.isFinite(n) && n > 0) {
    return { unit: "PIXELS", value: n };
  }
  return null;
}

function parseLetterSpacing(value: string): LetterSpacing | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("%")) {
    const n = Number(trimmed.slice(0, -1));
    if (Number.isFinite(n)) {
      return { unit: "PERCENT", value: n };
    }
    return null;
  }
  const n = Number(trimmed);
  if (Number.isFinite(n)) {
    return { unit: "PIXELS", value: n };
  }
  return null;
}

async function applyProperties(node: SceneNode, properties: Record<string, unknown>): Promise<void> {
  if (typeof properties.name === "string") {
    node.name = properties.name;
  }
  if ("x" in node && typeof properties.x === "number") {
    node.x = properties.x;
  }
  if ("y" in node && typeof properties.y === "number") {
    node.y = properties.y;
  }
  if ("resize" in node && (typeof properties.width === "number" || typeof properties.height === "number")) {
    const width = typeof properties.width === "number" ? properties.width : node.width;
    const height = typeof properties.height === "number" ? properties.height : node.height;
    node.resize(Math.max(1, width), Math.max(1, height));
  }

  if ("fills" in node && typeof properties.fill === "string") {
    const paints = parsePaints(properties.fill);
    if (paints) {
      node.fills = paints;
    }
  }

  if ("opacity" in node && typeof properties.opacity === "number") {
    node.opacity = Math.max(0, Math.min(1, properties.opacity));
  }

  if ("topLeftRadius" in node && typeof properties.radius === "number") {
    node.topLeftRadius = properties.radius;
    node.topRightRadius = properties.radius;
    node.bottomRightRadius = properties.radius;
    node.bottomLeftRadius = properties.radius;
  }

  if ("layoutMode" in node && typeof properties.layout === "string") {
    const lower = properties.layout.toLowerCase();
    if (lower === "horizontal") {
      node.layoutMode = "HORIZONTAL";
    } else if (lower === "vertical") {
      node.layoutMode = "VERTICAL";
    } else if (lower === "none") {
      node.layoutMode = "NONE";
    }
  }

  if ("itemSpacing" in node && typeof properties.gap === "number") {
    node.itemSpacing = properties.gap;
  }

  if ("paddingTop" in node) {
    const p = properties.padding;
    if (Array.isArray(p) && p.length === 4 && p.every((n) => typeof n === "number")) {
      node.paddingTop = p[0];
      node.paddingRight = p[1];
      node.paddingBottom = p[2];
      node.paddingLeft = p[3];
    } else if (typeof p === "string") {
      const values = p
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((x) => Number.isFinite(x));
      if (values.length === 1) {
        node.paddingTop = values[0];
        node.paddingRight = values[0];
        node.paddingBottom = values[0];
        node.paddingLeft = values[0];
      } else if (values.length === 4) {
        node.paddingTop = values[0];
        node.paddingRight = values[1];
        node.paddingBottom = values[2];
        node.paddingLeft = values[3];
      }
    }
  }

  if (node.type === "TEXT") {
    if (typeof properties.weight === "string" || typeof properties.fontFamily === "string") {
      const current = node.fontName === figma.mixed ? { family: "Inter", style: "Regular" } : node.fontName;
      const next = {
        family: typeof properties.fontFamily === "string" ? properties.fontFamily : current.family,
        style: typeof properties.weight === "string" ? properties.weight : current.style
      };
      await figma.loadFontAsync(next);
      node.fontName = next;
    }
    if (typeof properties.fontSize === "number") {
      node.fontSize = properties.fontSize;
    }
    if (typeof properties.text_content === "string") {
      const fontName = node.fontName === figma.mixed ? { family: "Inter", style: "Regular" } : node.fontName;
      await figma.loadFontAsync(fontName);
      node.characters = properties.text_content;
    }
    if (typeof properties.color === "string") {
      const paints = parsePaints(properties.color);
      if (paints) {
        node.fills = paints;
      }
    }
  }
}

type ExecuteActionsOptions = {
  selectResult: boolean;
};

type ActionRuntime = {
  aliases: Map<string, string>;
  createdNodes: SceneNode[];
  touchedNodeIds: Set<string>;
  messages: string[];
  exported: Array<{ actionType: string; nodeId: string; format: "PNG" | "JPG" | "PDF"; scale: number; bytes: Uint8Array }>;
};

async function executeVfActions(actions: VfAction[], options: ExecuteActionsOptions): Promise<{
  success: true;
  executed: number;
  createdNodeIds: string[];
  touchedNodeIds: string[];
  messages: string[];
  exports: Array<{ actionType: string; nodeId: string; format: string; scale: number; byteLength: number }>;
}> {
  const runtime: ActionRuntime = {
    aliases: new Map<string, string>(),
    createdNodes: [],
    touchedNodeIds: new Set<string>(),
    messages: [],
    exported: []
  };

  for (let i = 0; i < actions.length; i += 1) {
    const action = actions[i];
    if (!action || typeof action.type !== "string") {
      throw new Error(`Action at index ${i} is invalid.`);
    }

    await executeSingleAction(action, runtime);
  }

  const touchedNodes = await resolveTouchedNodes(runtime);
  if (options.selectResult && touchedNodes.length > 0) {
    figma.currentPage.selection = touchedNodes;
    figma.viewport.scrollAndZoomIntoView(touchedNodes);
  }

  if (runtime.touchedNodeIds.size > 0) {
    figma.commitUndo();
  }

  return {
    success: true,
    executed: actions.length,
    createdNodeIds: runtime.createdNodes.map((node) => node.id),
    touchedNodeIds: Array.from(runtime.touchedNodeIds.values()),
    messages: runtime.messages,
    exports: runtime.exported.map((item) => ({
      actionType: item.actionType,
      nodeId: item.nodeId,
      format: item.format,
      scale: item.scale,
      byteLength: item.bytes.length
    }))
  };
}

async function executeSingleAction(action: VfAction, runtime: ActionRuntime): Promise<void> {
  const type = action.type;

  if (type === "create") {
    const created = await executeCreateAction(action, runtime);
    runtime.createdNodes.push(created);
    runtime.touchedNodeIds.add(created.id);
    return;
  }

  if (type === "update") {
    const node = await resolveActionSceneNode(action.node_id, runtime, "update");
    const properties = asRecord(action.properties);
    if (!properties) {
      throw new Error("update action requires properties object.");
    }
    await applyProperties(node, properties);
    runtime.touchedNodeIds.add(node.id);
    return;
  }

  if (type === "set") {
    const node = await resolveActionSceneNode(action.node_id, runtime, "set");
    const patch = asRecord(action.patch);
    if (!patch) {
      throw new Error("set action requires patch object.");
    }
    await applyAdvancedPatch(node, patch, runtime);
    runtime.touchedNodeIds.add(node.id);
    return;
  }

  if (type === "delete") {
    const node = await resolveActionSceneNode(action.node_id, runtime, "delete");
    if (!node.removed) {
      node.remove();
      runtime.touchedNodeIds.add(node.id);
    }
    return;
  }

  if (type === "clone") {
    const source = await resolveActionSceneNode(action.node_id, runtime, "clone");
    if (!("clone" in source)) {
      throw new Error("clone action target does not support clone().");
    }
    const cloned = source.clone();
    const targetParent = await resolveParentFromAny(action.parent_id, runtime);
    if (targetParent) {
      targetParent.appendChild(cloned);
    }
    const alias = asString(action.alias);
    if (alias) {
      runtime.aliases.set(alias, cloned.id);
    }
    runtime.createdNodes.push(cloned);
    runtime.touchedNodeIds.add(cloned.id);
    return;
  }

  if (type === "reparent") {
    const node = await resolveActionSceneNode(action.node_id, runtime, "reparent");
    const parent = await resolveParentFromAction(action.parent_id, runtime, "reparent");
    const index = asFiniteNumber(action.index);
    parent.appendChild(node);
    if (typeof index === "number" && index >= 0 && index < parent.children.length) {
      parent.insertChild(Math.floor(index), node);
    }
    runtime.touchedNodeIds.add(node.id);
    return;
  }

  if (type === "group") {
    const ids = toStringArray(action.node_ids);
    if (ids.length === 0) {
      throw new Error("group action requires node_ids.");
    }
    const nodes = await resolveSceneNodesByIds(ids, runtime);
    if (nodes.length === 0) {
      throw new Error("group action resolved zero nodes.");
    }
    const parent = nodes[0].parent;
    if (!parent || !("children" in parent)) {
      throw new Error("group action target nodes have no valid parent.");
    }
    const grouped = figma.group(nodes, parent as BaseNode & ChildrenMixin);
    const name = asString(action.name);
    if (name) {
      grouped.name = name;
    }
    const alias = asString(action.alias);
    if (alias) {
      runtime.aliases.set(alias, grouped.id);
    }
    runtime.createdNodes.push(grouped);
    runtime.touchedNodeIds.add(grouped.id);
    return;
  }

  if (type === "ungroup") {
    const group = await resolveActionSceneNode(action.node_id, runtime, "ungroup");
    if (group.type !== "GROUP") {
      throw new Error("ungroup action requires a GROUP node.");
    }
    const children = figma.ungroup(group);
    for (const child of children) {
      runtime.touchedNodeIds.add(child.id);
    }
    return;
  }

  if (type === "boolean") {
    const operation = asString(action.operation).toLowerCase();
    const ids = toStringArray(action.node_ids);
    const nodes = await resolveSceneNodesByIds(ids, runtime);
    if (nodes.length < 2) {
      throw new Error("boolean action requires at least 2 nodes.");
    }
    const parent = nodes[0].parent;
    if (!parent || !("children" in parent)) {
      throw new Error("boolean action requires nodes with a common parent.");
    }
    let result: BooleanOperationNode;
    if (operation === "union") {
      result = figma.union(nodes, parent as BaseNode & ChildrenMixin);
    } else if (operation === "subtract") {
      result = figma.subtract(nodes, parent as BaseNode & ChildrenMixin);
    } else if (operation === "intersect") {
      result = figma.intersect(nodes, parent as BaseNode & ChildrenMixin);
    } else if (operation === "exclude") {
      result = figma.exclude(nodes, parent as BaseNode & ChildrenMixin);
    } else {
      throw new Error(`Unsupported boolean operation: ${operation}`);
    }
    const alias = asString(action.alias);
    if (alias) {
      runtime.aliases.set(alias, result.id);
    }
    runtime.createdNodes.push(result);
    runtime.touchedNodeIds.add(result.id);
    return;
  }

  if (type === "flatten") {
    const ids = toStringArray(action.node_ids);
    const nodes = await resolveSceneNodesByIds(ids, runtime);
    if (nodes.length === 0) {
      throw new Error("flatten action requires node_ids.");
    }
    const flattened = figma.flatten(nodes);
    const alias = asString(action.alias);
    if (alias) {
      runtime.aliases.set(alias, flattened.id);
    }
    runtime.createdNodes.push(flattened);
    runtime.touchedNodeIds.add(flattened.id);
    return;
  }

  if (type === "set_selection") {
    const ids = toStringArray(action.node_ids);
    const nodes = await resolveSceneNodesByIds(ids, runtime);
    figma.currentPage.selection = nodes;
    if (nodes.length > 0) {
      figma.viewport.scrollAndZoomIntoView(nodes);
    }
    return;
  }

  if (type === "set_viewport") {
    const center = asRecord(action.center);
    if (center && typeof center.x === "number" && typeof center.y === "number") {
      figma.viewport.center = { x: center.x, y: center.y };
    }
    const zoom = asFiniteNumber(action.zoom);
    if (typeof zoom === "number" && zoom > 0) {
      figma.viewport.zoom = zoom;
    }
    return;
  }

  if (type === "export") {
    const node = await resolveActionSceneNode(action.node_id, runtime, "export");
    if (!isExportable(node)) {
      throw new Error("export action target cannot be exported.");
    }
    const formatRaw = asString(action.format).toUpperCase();
    const format: "PNG" | "JPG" | "PDF" = formatRaw === "JPG" || formatRaw === "PDF" ? formatRaw : "PNG";
    const scale = Math.max(0.01, Math.min(4, asNumber(action.scale, 1)));
    const bytes = await node.exportAsync({ format, constraint: { type: "SCALE", value: scale } });
    runtime.exported.push({ actionType: type, nodeId: node.id, format, scale, bytes });
    runtime.messages.push(`exported ${node.id} as ${format} (${bytes.length} bytes)`);
    return;
  }

  throw new Error(`Unsupported vf action type: ${type}`);
}

async function executeCreateAction(action: VfAction, runtime: ActionRuntime): Promise<SceneNode> {
  const nodeType = asString(action.node_type).toLowerCase();
  if (!nodeType) {
    throw new Error("create action requires node_type.");
  }
  const parent = await resolveParentFromAny(action.parent_id, runtime);
  const node = await createNodeByType(nodeType);
  if (!node) {
    throw new Error(`Unsupported create node_type: ${nodeType}`);
  }

  if (parent) {
    parent.appendChild(node);
  }

  const alias = asString(action.alias);
  if (alias) {
    runtime.aliases.set(alias, node.id);
  }

  const attrs = asRecord(action.attrs);
  if (attrs) {
    await applyAttributes(node, normalizeToStringMap(attrs));
  }

  const properties = asRecord(action.properties);
  if (properties) {
    await applyProperties(node, properties);
  }

  const patch = asRecord(action.patch);
  if (patch) {
    await applyAdvancedPatch(node, patch, runtime);
  }

  return node;
}

async function createNodeByType(nodeType: string): Promise<SceneNode | null> {
  if (nodeType === "frame") return figma.createFrame();
  if (nodeType === "group") return figma.createFrame();
  if (nodeType === "rectangle") return figma.createRectangle();
  if (nodeType === "ellipse") return figma.createEllipse();
  if (nodeType === "line") return figma.createLine();
  if (nodeType === "polygon") return figma.createPolygon();
  if (nodeType === "star") return figma.createStar();
  if (nodeType === "vector") return figma.createVector();
  if (nodeType === "section") return figma.createSection();
  if (nodeType === "text") {
    const node = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    return node;
  }
  if (nodeType === "component") return figma.createComponent();
  if (nodeType === "slice") return figma.createSlice();
  if (nodeType === "sticky") return figma.createSticky();
  if (nodeType === "shape_with_text") return figma.createShapeWithText();
  if (nodeType === "connector") return figma.createConnector();
  if (nodeType === "code_block") return figma.createCodeBlock();
  if (nodeType === "table") return figma.createTable();
  if (nodeType === "slide") return figma.createSlide();
  if (nodeType === "slide_row") return figma.createSlideRow();
  return null;
}

async function applyAdvancedPatch(node: SceneNode, patch: Record<string, unknown>, runtime: ActionRuntime): Promise<void> {
  await applyProperties(node, patch);

  if (typeof patch.name === "string") {
    node.name = patch.name;
  }

  if (typeof patch.visible === "boolean") {
    node.visible = patch.visible;
  }

  if (typeof patch.locked === "boolean") {
    node.locked = patch.locked;
  }

  if ("opacity" in node && typeof patch.opacity === "number") {
    node.opacity = clamp01(patch.opacity);
  }

  if ("isMask" in node && typeof patch.is_mask === "boolean") {
    node.isMask = patch.is_mask;
  }

  if ("effects" in node && Array.isArray(patch.effects)) {
    node.effects = parseEffects(patch.effects);
  }

  if ("blendMode" in node && typeof patch.blend_mode === "string") {
    const mode = parseBlendMode(patch.blend_mode);
    if (mode) {
      node.blendMode = mode;
    }
  }

  if ("strokes" in node && Array.isArray(patch.strokes)) {
    const strokes = parsePaintArrayValue(patch.strokes);
    if (strokes) {
      node.strokes = strokes;
    }
  }

  if ("fills" in node && Array.isArray(patch.fills)) {
    const fills = parsePaintArrayValue(patch.fills);
    if (fills) {
      node.fills = fills;
    }
  }

  if ("strokeWeight" in node && typeof patch.stroke_weight === "number") {
    node.strokeWeight = Math.max(0, patch.stroke_weight);
  }

  if ("strokeAlign" in node && typeof patch.stroke_align === "string") {
    const align = parseStrokeAlign(patch.stroke_align);
    if (align) {
      node.strokeAlign = align;
    }
  }

  if ("dashPattern" in node && Array.isArray(patch.stroke_dash_pattern)) {
    node.dashPattern = patch.stroke_dash_pattern.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  }

  if ("constraints" in node && isConstraintPatch(patch.constraints)) {
    node.constraints = patch.constraints;
  }

  if ("layoutMode" in node && typeof patch.layout_mode === "string") {
    const mode = parseLayoutMode(patch.layout_mode);
    if (mode) {
      node.layoutMode = mode;
    }
  }

  if ("primaryAxisSizingMode" in node && typeof patch.primary_axis_sizing_mode === "string") {
    const mode = parseLayoutSizingMode(patch.primary_axis_sizing_mode);
    if (mode) {
      node.primaryAxisSizingMode = mode;
    }
  }

  if ("counterAxisSizingMode" in node && typeof patch.counter_axis_sizing_mode === "string") {
    const mode = parseLayoutSizingMode(patch.counter_axis_sizing_mode);
    if (mode) {
      node.counterAxisSizingMode = mode;
    }
  }

  if ("layoutWrap" in node && typeof patch.layout_wrap === "string") {
    const wrap = parseLayoutWrap(patch.layout_wrap);
    if (wrap) {
      node.layoutWrap = wrap;
    }
  }

  if ("counterAxisAlignItems" in node && typeof patch.counter_axis_align_items === "string") {
    const align = parseCounterAxisAlign(patch.counter_axis_align_items);
    if (align) {
      node.counterAxisAlignItems = align;
    }
  }

  if ("primaryAxisAlignItems" in node && typeof patch.primary_axis_align_items === "string") {
    const align = parsePrimaryAxisAlign(patch.primary_axis_align_items);
    if (align) {
      node.primaryAxisAlignItems = align;
    }
  }

  if ("counterAxisAlignContent" in node && typeof patch.counter_axis_align_content === "string") {
    const align = parseCounterAxisAlignContent(patch.counter_axis_align_content);
    if (align) {
      node.counterAxisAlignContent = align;
    }
  }

  if ("itemReverseZIndex" in node && typeof patch.item_reverse_z_index === "boolean") {
    node.itemReverseZIndex = patch.item_reverse_z_index;
  }

  if ("strokesIncludedInLayout" in node && typeof patch.strokes_included_in_layout === "boolean") {
    node.strokesIncludedInLayout = patch.strokes_included_in_layout;
  }

  if ("itemSpacing" in node && typeof patch.item_spacing === "number") {
    node.itemSpacing = patch.item_spacing;
  }

  if ("paddingTop" in node && isPaddingPatch(patch.padding)) {
    applyPaddingPatch(node as AutoLayoutPaddingNode, patch.padding);
  }

  if ("layoutAlign" in node && typeof patch.layout_align === "string") {
    const align = parseLayoutAlign(patch.layout_align);
    if (align) {
      node.layoutAlign = align;
    }
  }

  if ("layoutPositioning" in node && typeof patch.layout_positioning === "string") {
    const positioning = parseLayoutPositioning(patch.layout_positioning);
    if (positioning) {
      node.layoutPositioning = positioning;
    }
  }

  if ("layoutGrow" in node && typeof patch.layout_grow === "number") {
    node.layoutGrow = patch.layout_grow;
  }

  if ("layoutSizingHorizontal" in node && typeof patch.layout_sizing_horizontal === "string") {
    const sizing = parseLayoutSizing(patch.layout_sizing_horizontal);
    if (sizing) {
      node.layoutSizingHorizontal = sizing;
    }
  }

  if ("layoutSizingVertical" in node && typeof patch.layout_sizing_vertical === "string") {
    const sizing = parseLayoutSizing(patch.layout_sizing_vertical);
    if (sizing) {
      node.layoutSizingVertical = sizing;
    }
  }

  if (typeof patch.x === "number" && "x" in node) {
    node.x = patch.x;
  }
  if (typeof patch.y === "number" && "y" in node) {
    node.y = patch.y;
  }
  if ("resize" in node && typeof patch.width === "number" && typeof patch.height === "number") {
    node.resize(Math.max(1, patch.width), Math.max(1, patch.height));
  }

  if (node.type === "TEXT") {
    await applyTextPatch(node, patch);
  }

  if ("topLeftRadius" in node && isCornerRadiiPatch(patch.corner_radii)) {
    node.topLeftRadius = patch.corner_radii.top_left;
    node.topRightRadius = patch.corner_radii.top_right;
    node.bottomRightRadius = patch.corner_radii.bottom_right;
    node.bottomLeftRadius = patch.corner_radii.bottom_left;
  }

  if ("reactions" in node && Array.isArray(patch.reactions)) {
    runtime.messages.push(`Ignoring reactions patch for node ${node.id}; reaction schema passthrough is not yet implemented.`);
  }

  if ("boundVariables" in node && isVariableBindingPatch(patch.bindings)) {
    applyVariableBindings(node, patch.bindings);
  }
}

async function applyTextPatch(node: TextNode, patch: Record<string, unknown>): Promise<void> {
  const fullRangeStart = 0;
  const fullRangeEnd = node.characters.length;

  if (typeof patch.font === "object" && patch.font) {
    const font = patch.font as Record<string, unknown>;
    const family = typeof font.family === "string" ? font.family : (node.fontName === figma.mixed ? "Inter" : node.fontName.family);
    const style = typeof font.style === "string" ? font.style : (node.fontName === figma.mixed ? "Regular" : node.fontName.style);
    const next = { family, style };
    await figma.loadFontAsync(next);
    node.fontName = next;
  }

  if (typeof patch.font_size === "number") {
    node.fontSize = patch.font_size;
  }

  if (typeof patch.text_case === "string") {
    const textCase = parseTextCase(patch.text_case);
    if (textCase) {
      node.textCase = textCase;
    }
  }

  if (typeof patch.text_decoration === "string") {
    const decoration = parseTextDecoration(patch.text_decoration);
    if (decoration) {
      node.textDecoration = decoration;
    }
  }

  if (typeof patch.text_align_horizontal === "string") {
    const align = parseTextAlignHorizontal(patch.text_align_horizontal);
    if (align) {
      node.textAlignHorizontal = align;
    }
  }

  if (typeof patch.text_align_vertical === "string") {
    const align = parseTextAlignVertical(patch.text_align_vertical);
    if (align) {
      node.textAlignVertical = align;
    }
  }

  if (typeof patch.text_auto_resize === "string") {
    const mode = parseTextAutoResize(patch.text_auto_resize);
    if (mode) {
      node.textAutoResize = mode;
    }
  }

  if (typeof patch.paragraph_indent === "number") {
    node.paragraphIndent = patch.paragraph_indent;
  }

  if (typeof patch.paragraph_spacing === "number") {
    node.paragraphSpacing = patch.paragraph_spacing;
  }

  if (typeof patch.list_spacing === "number") {
    node.listSpacing = patch.list_spacing;
  }

  if (typeof patch.hanging_punctuation === "boolean") {
    node.hangingPunctuation = patch.hanging_punctuation;
  }

  if (typeof patch.hanging_list === "boolean") {
    node.hangingList = patch.hanging_list;
  }

  if (typeof patch.open_type_features === "object" && patch.open_type_features) {
    // Reserved for future write support in typings.
  }

  if (typeof patch.line_height === "string") {
    const lineHeight = parseTextLineHeight(patch.line_height);
    if (lineHeight) {
      node.lineHeight = lineHeight;
    }
  }

  if (typeof patch.letter_spacing === "string") {
    const letterSpacing = parseLetterSpacing(patch.letter_spacing);
    if (letterSpacing) {
      node.letterSpacing = letterSpacing;
    }
  }

  if (typeof patch.hyperlink === "string") {
    node.hyperlink = { type: "URL", value: patch.hyperlink };
  } else if (patch.hyperlink === null) {
    node.hyperlink = null;
  }

  if (typeof patch.text === "string") {
    const fontName = node.fontName === figma.mixed ? { family: "Inter", style: "Regular" } : node.fontName;
    await figma.loadFontAsync(fontName);
    node.characters = patch.text;
  }
}

function applyVariableBindings(node: SceneNode, bindings: VariableBindingPatch): void {
  const entries = Object.entries(bindings);
  for (const [field, value] of entries) {
    const bindableField = field as VariableBindableNodeField;
    const variable = value ? figma.variables.getVariableById(value) : null;
    if (value !== null && !variable) {
      continue;
    }
    try {
      node.setBoundVariable(bindableField, variable);
    } catch (_error) {
      // ignore unsupported field
    }
  }
}

function parseEffects(raw: unknown[]): Effect[] {
  const effects: Effect[] = [];
  for (const item of raw) {
    const rec = asRecord(item);
    if (!rec) {
      continue;
    }

    const type = asString(rec.type).toUpperCase();
    const visible = rec.visible !== false;
    const blendMode = parseBlendMode(asString(rec.blendMode)) ?? "NORMAL";

    if (type === "DROP_SHADOW" || type === "INNER_SHADOW") {
      const color = parseRgbaValue(rec.color) ?? { r: 0, g: 0, b: 0, a: 0.25 };
      const offset = asRecord(rec.offset);
      const radius = asFiniteNumber(rec.radius) ?? 4;
      const spread = asFiniteNumber(rec.spread) ?? 0;
      effects.push({
        type: type as "DROP_SHADOW" | "INNER_SHADOW",
        visible,
        blendMode,
        color,
        radius,
        spread,
        offset: {
          x: (offset && typeof offset.x === "number") ? offset.x : 0,
          y: (offset && typeof offset.y === "number") ? offset.y : 2
        }
      });
      continue;
    }

    if (type === "LAYER_BLUR" || type === "BACKGROUND_BLUR") {
      const radius = asFiniteNumber(rec.radius) ?? 4;
      effects.push({
        type: type as "LAYER_BLUR" | "BACKGROUND_BLUR",
        visible,
        blurType: "NORMAL",
        radius
      });
    }
  }
  return effects;
}

function parsePaintArrayValue(raw: unknown[]): Paint[] | null {
  const paints: Paint[] = [];
  for (const item of raw) {
    const paint = parsePaintObject(item);
    if (paint) {
      paints.push(paint);
    }
  }
  return paints.length > 0 ? paints : null;
}

function parsePaintObject(value: unknown): Paint | null {
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  const type = asString(rec.type).toUpperCase();
  const visible = rec.visible !== false;
  const opacity = typeof rec.opacity === "number" ? clamp01(rec.opacity) : 1;
  const blendMode = parseBlendMode(asString(rec.blendMode)) ?? "NORMAL";

  if (type === "SOLID") {
    const color = parseRgbValue(rec.color);
    if (!color) {
      return null;
    }
    const solid: SolidPaint = {
      type: "SOLID",
      color,
      visible,
      opacity,
      blendMode
    };
    return solid;
  }

  if (type === "IMAGE") {
    const imageHash = asString(rec.imageHash);
    const scaleMode = parseImageScaleMode(asString(rec.scaleMode)) ?? "FILL";
    if (!imageHash) {
      return null;
    }
    const imagePaint: ImagePaint = {
      type: "IMAGE",
      imageHash,
      scaleMode,
      visible,
      opacity,
      blendMode
    };
    return imagePaint;
  }

  if (type === "VIDEO") {
    const videoHash = asString(rec.videoHash);
    if (!videoHash) {
      return null;
    }
    return {
      type: "VIDEO",
      videoHash,
      visible,
      opacity,
      blendMode,
      scaleMode: parseVideoScaleMode(asString(rec.scaleMode)) ?? "FILL"
    };
  }

  if (type.startsWith("GRADIENT_")) {
    const stops = Array.isArray(rec.gradientStops)
      ? parseGradientStopsFromObjects(rec.gradientStops)
      : null;
    if (!stops || !Array.isArray(rec.gradientTransform)) {
      return null;
    }
    return {
      type: type as GradientPaint['type'],
      gradientStops: stops,
      gradientTransform: rec.gradientTransform as Transform,
      visible,
      opacity,
      blendMode
    };
  }

  return null;
}

function parseGradientStopsFromObjects(rawStops: unknown[]): ColorStop[] | null {
  const stops: ColorStop[] = [];
  for (const item of rawStops) {
    const rec = asRecord(item);
    if (!rec) {
      continue;
    }
    const color = parseRgbaValue(rec.color);
    const position = asFiniteNumber(rec.position);
    if (!color || typeof position !== "number") {
      continue;
    }
    stops.push({ color, position: clamp01(position) });
  }
  return stops.length >= 2 ? stops : null;
}

function parseRgbValue(value: unknown): RGB | null {
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  if (typeof rec.r !== "number" || typeof rec.g !== "number" || typeof rec.b !== "number") {
    return null;
  }
  return {
    r: clamp01(rec.r),
    g: clamp01(rec.g),
    b: clamp01(rec.b)
  };
}

function parseRgbaValue(value: unknown): RGBA | null {
  const rec = asRecord(value);
  if (!rec) {
    return null;
  }
  if (typeof rec.r !== "number" || typeof rec.g !== "number" || typeof rec.b !== "number") {
    return null;
  }
  const alpha = typeof rec.a === "number" ? rec.a : 1;
  return {
    r: clamp01(rec.r),
    g: clamp01(rec.g),
    b: clamp01(rec.b),
    a: clamp01(alpha)
  };
}

type VariableBindingPatch = Record<string, string | null>;

type AutoLayoutPaddingNode = {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
};

function isVariableBindingPatch(value: unknown): value is VariableBindingPatch {
  if (!value || typeof value !== "object") {
    return false;
  }
  return true;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => String(item)).filter((item) => item.trim().length > 0);
}

function normalizeToStringMap(source: Record<string, unknown>): Record<string, string> {
  const output: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value == null) {
      continue;
    }
    output[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return output;
}

async function resolveParentFromAny(parentRef: unknown, runtime: ActionRuntime): Promise<(BaseNode & ChildrenMixin) | null> {
  const raw = asString(parentRef);
  if (!raw) {
    return figma.currentPage;
  }
  const resolvedId = runtime.aliases.get(raw) ?? raw;
  const node = await figma.getNodeByIdAsync(resolvedId);
  if (!node) {
    throw new Error(`Parent not found: ${raw}`);
  }
  if ("appendChild" in node) {
    return node as BaseNode & ChildrenMixin;
  }
  if ("parent" in node && node.parent && "appendChild" in node.parent) {
    return node.parent as BaseNode & ChildrenMixin;
  }
  throw new Error(`Node cannot be used as parent: ${raw}`);
}

async function resolveParentFromAction(parentRef: unknown, runtime: ActionRuntime, actionType: string): Promise<BaseNode & ChildrenMixin> {
  const parent = await resolveParentFromAny(parentRef, runtime);
  if (!parent) {
    throw new Error(`${actionType} action requires a valid parent.`);
  }
  return parent;
}

async function resolveActionSceneNode(nodeRef: unknown, runtime: ActionRuntime, actionType: string): Promise<SceneNode> {
  const raw = asString(nodeRef);
  if (!raw) {
    throw new Error(`${actionType} action requires node_id.`);
  }
  const resolvedId = runtime.aliases.get(raw) ?? raw;
  const node = await figma.getNodeByIdAsync(resolvedId);
  if (!isSceneNode(node)) {
    throw new Error(`${actionType} action node not found: ${raw}`);
  }
  return node;
}

async function resolveSceneNodesByIds(ids: string[], runtime: ActionRuntime): Promise<SceneNode[]> {
  const nodes: SceneNode[] = [];
  for (const id of ids) {
    const resolvedId = runtime.aliases.get(id) ?? id;
    const node = await figma.getNodeByIdAsync(resolvedId);
    if (isSceneNode(node)) {
      nodes.push(node);
    }
  }
  return nodes;
}

async function resolveTouchedNodes(runtime: ActionRuntime): Promise<SceneNode[]> {
  const result: SceneNode[] = [];
  for (const id of runtime.touchedNodeIds) {
    const node = await figma.getNodeByIdAsync(id);
    if (isSceneNode(node) && !node.removed) {
      result.push(node);
    }
  }
  return result;
}

function parseBlendMode(value: string): BlendMode | null {
  if (!value) {
    return null;
  }
  const upper = value.toUpperCase();
  const values: BlendMode[] = [
    "PASS_THROUGH", "NORMAL", "DARKEN", "MULTIPLY", "LINEAR_BURN", "COLOR_BURN",
    "LIGHTEN", "SCREEN", "LINEAR_DODGE", "COLOR_DODGE", "OVERLAY", "SOFT_LIGHT",
    "HARD_LIGHT", "DIFFERENCE", "EXCLUSION", "HUE", "SATURATION", "COLOR", "LUMINOSITY"
  ];
  return values.includes(upper as BlendMode) ? (upper as BlendMode) : null;
}

function parseStrokeAlign(value: string): "INSIDE" | "CENTER" | "OUTSIDE" | null {
  const upper = value.toUpperCase();
  if (upper === "INSIDE" || upper === "CENTER" || upper === "OUTSIDE") {
    return upper;
  }
  return null;
}

function parseLayoutMode(value: string): FrameNode['layoutMode'] | null {
  const upper = value.toUpperCase();
  if (upper === "NONE" || upper === "HORIZONTAL" || upper === "VERTICAL") {
    return upper as FrameNode['layoutMode'];
  }
  return null;
}

function parseLayoutSizingMode(value: string): AutoLayoutMixin['primaryAxisSizingMode'] | null {
  const upper = value.toUpperCase();
  if (upper === "AUTO" || upper === "FIXED") {
    return upper as AutoLayoutMixin['primaryAxisSizingMode'];
  }
  return null;
}

function parseLayoutWrap(value: string): AutoLayoutMixin['layoutWrap'] | null {
  const upper = value.toUpperCase();
  if (upper === "NO_WRAP" || upper === "WRAP") {
    return upper as AutoLayoutMixin['layoutWrap'];
  }
  return null;
}

function parseCounterAxisAlign(value: string): AutoLayoutMixin['counterAxisAlignItems'] | null {
  const upper = value.toUpperCase();
  if (upper === "MIN" || upper === "CENTER" || upper === "MAX" || upper === "BASELINE") {
    return upper as AutoLayoutMixin['counterAxisAlignItems'];
  }
  return null;
}

function parsePrimaryAxisAlign(value: string): AutoLayoutMixin['primaryAxisAlignItems'] | null {
  const upper = value.toUpperCase();
  if (upper === "MIN" || upper === "CENTER" || upper === "MAX" || upper === "SPACE_BETWEEN") {
    return upper as AutoLayoutMixin['primaryAxisAlignItems'];
  }
  return null;
}

function parseCounterAxisAlignContent(value: string): AutoLayoutMixin['counterAxisAlignContent'] | null {
  const upper = value.toUpperCase();
  if (upper === "AUTO" || upper === "SPACE_BETWEEN") {
    return upper as AutoLayoutMixin['counterAxisAlignContent'];
  }
  return null;
}

function parseLayoutAlign(value: string): AutoLayoutChildrenMixin['layoutAlign'] | null {
  const upper = value.toUpperCase();
  if (upper === "INHERIT" || upper === "STRETCH" || upper === "MIN" || upper === "CENTER" || upper === "MAX") {
    return upper as AutoLayoutChildrenMixin['layoutAlign'];
  }
  return null;
}

function parseLayoutPositioning(value: string): AutoLayoutChildrenMixin['layoutPositioning'] | null {
  const upper = value.toUpperCase();
  if (upper === "AUTO" || upper === "ABSOLUTE") {
    return upper as AutoLayoutChildrenMixin['layoutPositioning'];
  }
  return null;
}

function parseLayoutSizing(value: string): "FIXED" | "HUG" | "FILL" | null {
  const upper = value.toUpperCase();
  if (upper === "FIXED" || upper === "HUG" || upper === "FILL") {
    return upper;
  }
  return null;
}

function parseTextCase(value: string): TextCase | null {
  const upper = value.toUpperCase();
  const allowed: TextCase[] = ["ORIGINAL", "UPPER", "LOWER", "TITLE", "SMALL_CAPS", "SMALL_CAPS_FORCED"];
  return allowed.includes(upper as TextCase) ? (upper as TextCase) : null;
}

function parseTextDecoration(value: string): TextDecoration | null {
  const upper = value.toUpperCase();
  const allowed: TextDecoration[] = ["NONE", "UNDERLINE", "STRIKETHROUGH"];
  return allowed.includes(upper as TextDecoration) ? (upper as TextDecoration) : null;
}

function parseTextAlignHorizontal(value: string): "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED" | null {
  const upper = value.toUpperCase();
  const allowed = ["LEFT", "CENTER", "RIGHT", "JUSTIFIED"];
  return allowed.includes(upper) ? (upper as "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED") : null;
}

function parseTextAlignVertical(value: string): "TOP" | "CENTER" | "BOTTOM" | null {
  const upper = value.toUpperCase();
  const allowed = ["TOP", "CENTER", "BOTTOM"];
  return allowed.includes(upper) ? (upper as "TOP" | "CENTER" | "BOTTOM") : null;
}

function parseTextAutoResize(value: string): "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE" | null {
  const upper = value.toUpperCase();
  const allowed = ["NONE", "WIDTH_AND_HEIGHT", "HEIGHT", "TRUNCATE"];
  return allowed.includes(upper) ? (upper as "NONE" | "WIDTH_AND_HEIGHT" | "HEIGHT" | "TRUNCATE") : null;
}

function parseImageScaleMode(value: string): "FILL" | "FIT" | "CROP" | "TILE" | null {
  const upper = value.toUpperCase();
  const allowed = ["FILL", "FIT", "CROP", "TILE"];
  return allowed.includes(upper) ? (upper as "FILL" | "FIT" | "CROP" | "TILE") : null;
}

function parseVideoScaleMode(value: string): "FILL" | "FIT" | "CROP" | "TILE" | null {
  const upper = value.toUpperCase();
  const allowed = ["FILL", "FIT", "CROP", "TILE"];
  return allowed.includes(upper) ? (upper as "FILL" | "FIT" | "CROP" | "TILE") : null;
}

function isConstraintPatch(value: unknown): value is Constraints {
  const rec = asRecord(value);
  if (!rec) {
    return false;
  }
  const horizontal = typeof rec.horizontal === "string" ? rec.horizontal.toUpperCase() : "";
  const vertical = typeof rec.vertical === "string" ? rec.vertical.toUpperCase() : "";
  const horizontalValid = ["MIN", "CENTER", "MAX", "STRETCH", "SCALE"].includes(horizontal);
  const verticalValid = ["MIN", "CENTER", "MAX", "STRETCH", "SCALE"].includes(vertical);
  return horizontalValid && verticalValid;
}

function isPaddingPatch(value: unknown): value is number | [number, number] | [number, number, number, number] | Record<string, number> {
  if (typeof value === "number") {
    return true;
  }
  if (Array.isArray(value)) {
    return (value.length === 2 || value.length === 4) && value.every((item) => typeof item === "number" && Number.isFinite(item));
  }
  const rec = asRecord(value);
  if (!rec) {
    return false;
  }
  return ["top", "right", "bottom", "left"].every((key) => typeof rec[key] === "number" && Number.isFinite(rec[key]));
}

function applyPaddingPatch(node: AutoLayoutPaddingNode, value: number | [number, number] | [number, number, number, number] | Record<string, number>): void {
  if (typeof value === "number") {
    node.paddingTop = value;
    node.paddingRight = value;
    node.paddingBottom = value;
    node.paddingLeft = value;
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 2) {
      node.paddingTop = value[0];
      node.paddingBottom = value[0];
      node.paddingLeft = value[1];
      node.paddingRight = value[1];
      return;
    }
    node.paddingTop = value[0];
    node.paddingRight = value[1];
    node.paddingBottom = value[2];
    node.paddingLeft = value[3];
    return;
  }
  node.paddingTop = value.top;
  node.paddingRight = value.right;
  node.paddingBottom = value.bottom;
  node.paddingLeft = value.left;
}

function isCornerRadiiPatch(value: unknown): value is { top_left: number; top_right: number; bottom_right: number; bottom_left: number } {
  const rec = asRecord(value);
  if (!rec) {
    return false;
  }
  return (
    typeof rec.top_left === "number" &&
    typeof rec.top_right === "number" &&
    typeof rec.bottom_right === "number" &&
    typeof rec.bottom_left === "number"
  );
}
