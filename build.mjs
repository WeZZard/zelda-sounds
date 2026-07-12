#!/usr/bin/env node
// Generator for the zelda-sounds Claude Code plugin.
//
// Single canonical source:  canonical/
// Generated plugin tree:    repo root (this directory)
//
// Determinism contract: no timestamps, stable key order, stable formatting.
// Running this script twice MUST yield byte-identical output trees.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "canonical");

// Paths emitted at repo root by buildClaude — never delete canonical/ or repo metadata.
const GENERATED_PATHS = [
  ".claude-plugin",
  "hooks",
  "config",
  "sounds",
  "assets",
  "skills",
  "tools",
  "manifests",
  "configurator",
  "configurator.mjs",
  ".gitignore",
];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function jsonFile(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function writeText(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function copyInto(srcPath, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  cpSync(srcPath, destPath, { recursive: true, preserveTimestamps: true });
}

const DEFAULTS_KEY_ORDER = [
  "attention-needed",
  "plan-ready",
  "plan-approved",
  "task-complete",
  "error",
  "notification",
  "subagent-done",
  "session-started",
  "plan-mode-entered",
];

const DEFAULTS_DESCRIPTION = "Packaged default sound mapping for Zelda Sounds";

function buildPluginJson(manifest) {
  return jsonFile({
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
  });
}

function buildDefaultsJson(moments) {
  const byId = new Map(moments.map((m) => [m.id, m]));
  const map = {};
  for (const id of DEFAULTS_KEY_ORDER) {
    const moment = byId.get(id);
    map[id] = moment ? (moment.default ?? null) : null;
  }
  return jsonFile({ description: DEFAULTS_DESCRIPTION, moments: map });
}

function buildHooksJson(moments, binding) {
  const hooks = {};
  for (const moment of moments) {
    const bind = binding.moments[moment.id];
    if (!bind) continue;
    const group = {
      hooks: [
        {
          type: "command",
          command: `node "\${CLAUDE_PLUGIN_ROOT}/hooks/play-configured-sound.mjs" "${moment.id}"`,
        },
      ],
    };
    if (bind.matcher !== null && bind.matcher !== undefined) {
      group.matcher = bind.matcher;
    }
    (hooks[bind.event] ??= []).push(group);
  }
  return jsonFile({ description: binding.description, hooks });
}

async function bundleConfigurator(outFile) {
  await esbuild({
    entryPoints: [join(SRC, "configurator", "src", "server.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node18",
    outfile: outFile,
    banner: { js: "#!/usr/bin/env node" },
    logLevel: "warning",
    define: { "process.env.ZELDA_TOOL": JSON.stringify("claude") },
  });
}

function cleanGenerated(outDir) {
  for (const rel of GENERATED_PATHS) {
    const path = join(outDir, rel);
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  }
}

async function buildClaude(outDir) {
  cleanGenerated(outDir);
  mkdirSync(outDir, { recursive: true });

  const manifest = readJson(join(SRC, "manifest.json"));
  const moments = readJson(join(SRC, "moments.json")).moments;
  const claudeBinding = readJson(join(SRC, "bindings", "claude.json"));

  writeText(join(outDir, ".claude-plugin", "plugin.json"), buildPluginJson(manifest));
  writeText(join(outDir, "hooks", "hooks.json"), buildHooksJson(moments, claudeBinding));
  writeText(join(outDir, "config", "defaults.json"), buildDefaultsJson(moments));

  copyInto(join(SRC, "player", "play-configured-sound.mjs"), join(outDir, "hooks", "play-configured-sound.mjs"));
  copyInto(join(SRC, "player", "play-sound.sh"), join(outDir, "hooks", "play-sound.sh"));
  copyInto(join(SRC, "config", "settings.json"), join(outDir, "config", "settings.json"));
  copyInto(join(SRC, "config", "user-config.json"), join(outDir, "config", "user-config.json"));
  copyInto(join(SRC, "sounds"), join(outDir, "sounds"));
  copyInto(join(SRC, "assets"), join(outDir, "assets"));
  copyInto(join(SRC, "skills"), join(outDir, "skills"));
  if (existsSync(join(SRC, ".gitignore"))) {
    copyInto(join(SRC, ".gitignore"), join(outDir, ".gitignore"));
  }

  copyInto(join(SRC, "authoring", "tools"), join(outDir, "tools"));
  copyInto(join(SRC, "authoring", "manifests"), join(outDir, "manifests"));
  copyInto(join(SRC, "configurator", "package.json"), join(outDir, "configurator", "package.json"));
  copyInto(join(SRC, "configurator", "package-lock.json"), join(outDir, "configurator", "package-lock.json"));
  copyInto(join(SRC, "configurator", "src", "server.ts"), join(outDir, "configurator", "src", "server.ts"));
  await bundleConfigurator(join(outDir, "configurator.mjs"));
}

async function main() {
  await buildClaude(ROOT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
