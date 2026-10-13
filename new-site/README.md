# Johannes Roth's website

Astro site for [jroth.space](https://jroth.space). The homepage is at `/`, with writing at `/blog` and the editor at `/admin`. The `/v2` URLs remain working aliases.

## Local website and writing editor

From `new-site`, use Node 20.19.1 (`nvm use`), then run:

```sh
npm ci
npm run dev:cms
```

- Website: <http://127.0.0.1:4321/>
- Writing editor: <http://127.0.0.1:4321/admin/>

The editor uses [Decap CMS](https://decapcms.org/docs/decap-proxy/). Click **Login**, choose a post under **Writing**, and edit its title, description, date, tags, and body. The body has **Rich Text** and **Markdown** modes, with a preview using the site's design system. Use Markdown mode for existing HTML figures and image layouts.

Click **Publish → Publish now** to save locally. Astro picks up the saved Markdown file immediately. New posts start with **Draft** enabled; turn it off when the post should appear on the site. Images uploaded through **Media** go to `public/blog/uploads`.

Content lives in `src/content/blog/*.md`. Existing filenames remain the post URLs. The local editing server runs on `127.0.0.1:8085` and saves directly into this checkout. Stop both servers with Ctrl+C.

If the website is already running, start only the editing server with `npm run cms:server`. For website-only work, use `npm run dev`.

## Build and hosted editing

`npm run build` exports the static site to `dist`. The GitHub Pages workflow builds and publishes pushes to `main`.

Hosted editing at `/blog/admin/` runs on the personal VPS with its own username/password.
Posts and media are stored on the server and rebuild the site when published. See
[ops/README.md](ops/README.md) for login-file location, content paths, deployment and backups.
Local editing continues to use the local backend. Website code changes are pulled from
GitHub automatically; online writing lives in the VPS content directory.

## Design

The shared v2 tokens and layout rules are documented in [docs/V2_DESIGN_SYSTEM.md](docs/V2_DESIGN_SYSTEM.md).
