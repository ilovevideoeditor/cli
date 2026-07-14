#!/usr/bin/env node
/**
 * iLoveVideoEditor CLI — render videos from VideoJSON specs in your terminal or CI.
 *
 * Commands:
 *   render <spec.json>    Queue a render and wait for the MP4
 *   status <job-id>       Check render status
 *   estimate <spec.json>  Estimate credit cost
 *   templates             List public templates
 *
 * Auth: ILOVEVIDEOEDITOR_API_KEY env var or --api-key flag.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import {
  ILoveVideoEditorClient,
  ILoveVideoEditorError,
} from '@ilovevideoeditor/sdk-node';

const VERSION = '1.0.0';

const USAGE = `ilovevideoeditor — render videos from the command line

Usage:
  ilovevideoeditor <command> [args] [flags]

Commands:
  render <spec.json>    Queue a render and wait for the MP4
  status <job-id>       Check render status
  estimate <spec.json>  Estimate credit cost
  templates             List public templates
  version               Print version
  help                  Show this help

Flags:
  -o, --output <file>   Download rendered video to file (render)
  --no-wait             Queue and exit without polling (render)
  --json                Machine-readable JSON output
  --search <query>      Filter templates by name/id (templates)
  --api-key <key>       API key (env: ILOVEVIDEOEDITOR_API_KEY)
  --api-base <url>      API base URL (env: ILOVEVIDEOEDITOR_API_BASE,
                        default https://api.ilovevideoeditor.com)

Examples:
  export ILOVEVIDEOEDITOR_API_KEY=vf_live_...
  ilovevideoeditor render video.json -o out.mp4
  ilovevideoeditor render video.json --no-wait --json
  ilovevideoeditor status 425ba18a-dab0-4827-afc9-eec80e5b3c20
  ilovevideoeditor estimate video.json
  ilovevideoeditor templates --search cinematic
`;

interface CliFlags {
  json: boolean;
  apiKey?: string;
  apiBase?: string;
}

function parseFlags(args: string[]): {
  values: Record<string, unknown>;
  positionals: string[];
} {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        'no-wait': { type: 'boolean', default: false },
        json: { type: 'boolean', default: false },
        search: { type: 'string' },
        'api-key': { type: 'string' },
        'api-base': { type: 'string' },
      },
    });
    return { values: values as Record<string, unknown>, positionals };
  } catch (err) {
    fail(`invalid flags: ${(err as Error).message}`, 2);
  }
}

function fail(message: string, code = 1): never {
  console.error(`error: ${message}`);
  process.exit(code);
}

function makeClient(flags: CliFlags): ILoveVideoEditorClient {
  const apiKey = flags.apiKey ?? process.env.ILOVEVIDEOEDITOR_API_KEY;
  if (!apiKey) {
    fail('missing API key — set ILOVEVIDEOEDITOR_API_KEY or pass --api-key', 2);
  }
  const baseUrl =
    flags.apiBase ??
    process.env.ILOVEVIDEOEDITOR_API_BASE ??
    'https://api.ilovevideoeditor.com';
  return new ILoveVideoEditorClient({ apiKey, baseUrl });
}

async function readSpec(path: string): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch {
    fail(`cannot read spec file: ${path}`);
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    fail(`invalid JSON in spec file: ${path}`);
  }
}

function out(flags: CliFlags, data: unknown, human: () => void): void {
  if (flags.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    human();
  }
}

async function cmdRender(
  flags: CliFlags,
  positionals: string[],
  values: Record<string, unknown>,
) {
  const specPath = positionals[0];
  if (!specPath) fail('render requires a <spec.json> path', 2);

  const videoJSON = await readSpec(specPath);
  const client = makeClient(flags);
  const noWait = values['no-wait'] === true;
  const output = typeof values.output === 'string' ? values.output : undefined;
  const quiet = flags.json || !process.stderr.isTTY;

  if (noWait) {
    const queued = await client.queueRender(videoJSON);
    out(flags, queued, () => {
      console.log(`queued: ${queued.jobId} (${queued.status})`);
    });
    return;
  }

  const result = await client.render(videoJSON, {
    onProgress: (state) => {
      if (quiet) return;
      process.stderr.write(`\r${state.status} ${state.progress}%   `);
    },
  });
  if (!quiet) process.stderr.write('\n');

  if (result.status !== 'completed') {
    fail(`render ${result.status}: ${result.error ?? 'unknown error'}`);
  }

  let file: string | undefined;
  let bytes = 0;
  if (output) {
    const { url } = await client.downloadRender(result.jobId);
    const res = await fetch(url, {
      headers: { 'user-agent': `ilovevideoeditor-cli/${VERSION}` },
    });
    if (!res.ok) fail(`download failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(output, buf);
    file = output;
    bytes = buf.length;
  }

  out(
    flags,
    {
      jobId: result.jobId,
      status: result.status,
      downloadUrl: result.downloadUrl,
      file,
      bytes,
    },
    () => {
      console.log(`completed: ${result.jobId}`);
      if (file) {
        console.log(`saved: ${file} (${bytes} bytes)`);
      } else {
        console.log(`download: ${result.downloadUrl}`);
      }
    },
  );
}

async function cmdStatus(flags: CliFlags, positionals: string[]) {
  const jobId = positionals[0];
  if (!jobId) fail('status requires a <job-id>', 2);

  const client = makeClient(flags);
  const result = await client.getRender(jobId);
  out(flags, result, () => {
    console.log(`${result.jobId}: ${result.status}`);
    if (result.progress) {
      console.log(
        `progress: ${result.progress.percent}% (${result.progress.done}/${result.progress.total})`,
      );
    }
    if (result.downloadUrl) console.log(`download: ${result.downloadUrl}`);
    if (result.error) console.log(`error: ${result.error}`);
  });
}

async function cmdEstimate(flags: CliFlags, positionals: string[]) {
  const specPath = positionals[0];
  if (!specPath) fail('estimate requires a <spec.json> path', 2);

  const videoJSON = await readSpec(specPath);
  const client = makeClient(flags);
  const estimate = await client.estimateRenderCost(videoJSON);
  out(flags, estimate, () => {
    console.log(`cost: ${estimate.cost} credits`);
    console.log(`duration: ${estimate.estimatedDuration}s`);
    console.log(
      `resolution: ${estimate.resolution.label} @ ${estimate.fps}fps`,
    );
  });
}

async function cmdTemplates(flags: CliFlags, values: Record<string, unknown>) {
  const client = makeClient(flags);
  const search =
    typeof values.search === 'string' ? values.search.toLowerCase() : undefined;
  let templates = await client.listTemplates();
  if (search) {
    templates = templates.filter(
      (t) =>
        t.id.toLowerCase().includes(search) ||
        t.name.toLowerCase().includes(search) ||
        (t.description ?? '').toLowerCase().includes(search),
    );
  }
  out(flags, templates, () => {
    for (const t of templates) {
      console.log(`${t.id.padEnd(28)} ${t.name}`);
    }
    console.log(`\n${templates.length} templates`);
  });
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (
    !command ||
    command === 'help' ||
    command === '--help' ||
    command === '-h'
  ) {
    console.log(USAGE);
    return;
  }
  if (command === 'version' || command === '--version' || command === '-v') {
    console.log(VERSION);
    return;
  }

  const { values, positionals } = parseFlags(rest);
  const flags: CliFlags = {
    json: values.json === true,
    apiKey:
      typeof values['api-key'] === 'string' ? values['api-key'] : undefined,
    apiBase:
      typeof values['api-base'] === 'string' ? values['api-base'] : undefined,
  };

  switch (command) {
    case 'render':
      await cmdRender(flags, positionals, values);
      break;
    case 'status':
      await cmdStatus(flags, positionals);
      break;
    case 'estimate':
      await cmdEstimate(flags, positionals);
      break;
    case 'templates':
      await cmdTemplates(flags, values);
      break;
    default:
      console.error(`error: unknown command '${command}'\n`);
      console.log(USAGE);
      process.exit(2);
  }
}

main().catch((err) => {
  if (err instanceof ILoveVideoEditorError) {
    fail(`API error (HTTP ${err.statusCode ?? '?'}): ${err.message}`);
  }
  fail((err as Error).message ?? String(err));
});
