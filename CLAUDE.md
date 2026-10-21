# jroth.space

Johannes's personal website at https://jroth.space. The Astro site lives in `new-site/`;
run all npm commands from there.

## Run and test

- Node 20.19.1 (`new-site/.nvmrc`, `nvm use`), then `npm ci`.
- `npm run dev:cms`: site on http://127.0.0.1:4321/ plus the local writing editor at
  `/admin/` (Decap server on 127.0.0.1:8085, saves straight into the checkout).
  `npm run dev` for site-only work; `npm run cms:server` starts only the editing server.
- `npm run build` exports the static site to `new-site/dist`.
- Editor routing test (from the repo root): `node --test new-site/scripts/tests/editor-route.test.mjs`.
- Posts: `new-site/src/content/blog/*.md` (filenames are the URLs). Design tokens and layout
  rules: `new-site/docs/V2_DESIGN_SYSTEM.md`.

## Deployment

`new-site/ops/README.md` is the source of truth (operations, rollback, backups). In short:
nginx on the VPS (`ssh personal_vps`) serves jroth.space; a systemd timer there builds
GitHub `main` every two minutes and on editor saves, and switches releases atomically. A
failed build keeps the previous release. Online posts and uploads live in the VPS editor's
content directory, not in git. Pushes to `main` also run the GitHub Pages workflow.

- The Decap CMS editor stays at the same-origin `/blog/admin/` with its existing login. No
  new hosts, credential migrations or custom auth.
- `config.yml` must be served as `text/yaml` (`ops/nginx-editor.conf`). An
  `Unexpected token '<'` error in the editor means a routing problem: HTML came back.
- Run `sudo nginx -t` with the limits config (`ops/nginx-limits.conf`, defines the
  `editor_login` zone) installed before any reload.
- VPS builds are memory-capped (`MemoryMax=2500M` in `ops/website-deploy.service`).
- Leave the editor service on 127.0.0.1:8085 and Horrorverse on 127.0.0.1:8086 alone.

## Preferences

- Keep the site's distinctive personal identity and its Work/Life structure (mode links
  in `src/layouts/V2Layout.astro`). No generic portfolio layouts.
- A local preview is not a deployment. Before reporting a deploy, verify DNS, HTTPS and the
  live page.
