# AUR packaging for ilovevideoeditor

The package is source-based: it installs the official npm tarball with
`npm install -g` (Arch convention for npm CLI tools), so it needs no
prebuilt binaries and tracks npm releases.

## Publish (one-time, manual account step)

AUR requires a registered account with an SSH key — this cannot be automated:

1. Register at https://aur.archlinux.org/register and add your SSH public key.
2. Then publish:

```bash
git clone ssh://aur@aur.archlinux.org/ilovevideoeditor.git /tmp/aur-ilve
cp PKGBUILD .SRCINFO /tmp/aur-ilve/
cd /tmp/aur-ilve
git add -A && git commit -m "Initial import: ilovevideoeditor 1.0.0"
git push
```

## Updating on a new release

1. Bump `pkgver` in `PKGBUILD`, recompute `sha256sums`:
   `curl -sL https://registry.npmjs.org/ilovevideoeditor/-/ilovevideoeditor-<ver>.tgz | sha256sum`
2. Regenerate `.SRCINFO` on an Arch machine (or with `makepkg --printsrcinfo`
   from the `pacman` package) — or edit it by hand, the format is stable.
3. Commit and push to AUR.

Optional later automation: a GitHub workflow with `AUR_SSH_KEY` secret that
pushes the bumped files (e.g. via `KSXGitHub/github-actions-deploy-aur`).
