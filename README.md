# ilovevideoeditor

[![npm version](https://img.shields.io/npm/v/ilovevideoeditor.svg)](https://www.npmjs.com/package/ilovevideoeditor)
[![license](https://img.shields.io/npm/l/ilovevideoeditor.svg)](https://github.com/ilovevideoeditor/cli/blob/main/LICENSE)

Official CLI for [iLoveVideoEditor](https://ilovevideoeditor.com) — render videos from
VideoJSON specs in your terminal or CI/CD pipeline.

```bash
export ILOVEVIDEOEDITOR_API_KEY=vf_live_...
npx ilovevideoeditor render video.json -o out.mp4
```

## Install

```bash
# Homebrew (macOS & Linux)
brew tap ilovevideoeditor/tap
brew install ilovevideoeditor

# Scoop (Windows)
scoop bucket add ilovevideoeditor https://github.com/ilovevideoeditor/scoop-bucket
scoop install ilovevideoeditor

# winget (Windows) — pending microsoft/winget-pkgs#402460
winget install ilovevideoeditor

# Docker (Docker Hub or GHCR — multi-arch: amd64 + arm64)
docker run --rm -e ILOVEVIDEOEDITOR_API_KEY -v "$PWD:/work" \
  ilovevideoeditor/cli render video.json -o out.mp4
# or: ghcr.io/ilovevideoeditor/cli render video.json -o out.mp4

# Arch Linux (AUR, source-based)
yay -S ilovevideoeditor

# npm (requires Node.js 18+)
npm install -g ilovevideoeditor

# or run without installing
npx ilovevideoeditor --help
```

Get an API key from the
[dashboard](https://ilovevideoeditor.com/dashboard). All install channels are
listed at [ilovevideoeditor.com/install](https://ilovevideoeditor.com/install).

## Commands

| Command | Description |
|---|---|
| `render <spec.json>` | Queue a render and wait for the MP4 |
| `status <job-id>` | Check render status |
| `estimate <spec.json>` | Estimate credit cost before rendering |
| `templates` | List the 249+ public templates |

### Flags

| Flag | Description |
|---|---|
| `-o, --output <file>` | Download the rendered video to a file |
| `--no-wait` | Queue and exit immediately (returns the job ID) |
| `--json` | Machine-readable JSON output (for CI) |
| `--search <query>` | Filter templates by name/id |
| `--api-key <key>` | API key (env: `ILOVEVIDEOEDITOR_API_KEY`) |
| `--api-base <url>` | API base URL override (env: `ILOVEVIDEOEDITOR_API_BASE`) |

## Examples

Render and download:

```bash
ilovevideoeditor render video.json -o promo.mp4
```

Fire-and-forget (queue only, JSON output for CI):

```bash
ilovevideoeditor render video.json --no-wait --json
# {
#   "jobId": "425ba18a-dab0-4827-afc9-eec80e5b3c20",
#   "status": "queued"
# }
```

Check status later:

```bash
ilovevideoeditor status 425ba18a-dab0-4827-afc9-eec80e5b3c20 --json
```

Estimate cost before spending credits:

```bash
ilovevideoeditor estimate video.json
# cost: 0.04 credits
# duration: 2s
# resolution: 640x360 @ 30fps
```

## GitHub Action

Render videos in CI/CD with the official action:

```yaml
- uses: ilovevideoeditor/render-video-action@v1
  with:
    api-key: ${{ secrets.ILOVEVIDEOEDITOR_API_KEY }}
    spec: video.json
    output: promo.mp4
```

See [ilovevideoeditor/render-video-action](https://github.com/ilovevideoeditor/render-video-action).

## VideoJSON

A VideoJSON spec describes the scene: layers, text, images, animations, and timing.
Generate one with the [fluent API](https://www.npmjs.com/package/@ilovevideoeditor/core):

```ts
import ILoveVideoEditor from '@ilovevideoeditor/core';

const $ = new ILoveVideoEditor({ name: 'Promo', width: 1920, height: 1080, fps: 30 });
$.addText({ text: 'Hello', fontSize: 12, color: '#fff' });
$.wait('3s');
console.log(JSON.stringify(await $.compile()));
```

## Related packages

- [`@ilovevideoeditor/core`](https://www.npmjs.com/package/@ilovevideoeditor/core) — fluent API to build VideoJSON specs
- [`@ilovevideoeditor/sdk-node`](https://www.npmjs.com/package/@ilovevideoeditor/sdk-node) — typed Node.js SDK
- [Python](https://pypi.org/project/ilovevideoeditor-sdk/) · [PHP](https://packagist.org/packages/ilovevideoeditor/sdk) · [Ruby](https://rubygems.org/gems/ilovevideoeditor-sdk) · [Go](https://pkg.go.dev/github.com/ilovevideoeditor/sdk-go) SDKs

## License

MIT
