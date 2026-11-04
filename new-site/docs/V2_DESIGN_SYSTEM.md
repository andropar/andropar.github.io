# V2 design system

This document describes the system implemented in `src/styles/v2.css` and used by
`src/layouts/V2Layout.astro`, `src/pages/index.astro`, `src/pages/blog/index.astro`, and
`src/pages/blog/[slug].astro`. Every value below exists as a CSS custom property or a named
component class in that stylesheet.

## Direction

A dense, white page. **Whitespace goes between blocks; inside a block, information sits tight.** One
sans-serif family, small type, hairline rules on top of every panel, and colour used sparingly: a
muted four-colour palette appears only in data graphics and as faint tints behind them. Personality
comes from the writing, the two portraits, the personal photos, and figures drawn from the projects'
own data, each in its own style.

Work and Life share the hero, panel, tile, list-row and photo-band components. The writing index and
articles use the same header, type scale, list rows and link styles.

The two hero bodies share the height of the taller body. The layout measures their natural size
after fonts load and whenever the page width changes, so switching Work/Life keeps the next section
at the same vertical position.

## Tokens

### Color

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#ffffff` | `#141513` | Page background, header (92% with blur) |
| `--surface` | `#f3f3f1` | `#1d1f1c` | Media frames, view-switch track, code, hover fills |
| `--raised` | `#ffffff` | `#242622` | Active view-switch segment, image dialog |
| `--ink` | `#1c1d1a` | `#ecebe6` | Headings, body, primary button fill |
| `--secondary` | `#4d4f49` | `#bdbcb4` | Descriptions, ledes, nav links |
| `--muted` | `#6b6d66` | `#94938b` | Metadata, dates, captions, arrows, footer |
| `--line` | `#e7e7e3` | `#2e302c` | Rules inside panels, list rows, image hairlines |
| `--line-strong` | `#cfcfca` | `#464942` | Panel top rules, button borders, link underlines |
| `--on-ink` | `#ffffff` | `#141513` | Text on ink or accent fills |

**Palette.** Four colours, `--q1` blue `#5b7cf0`, `--q2` pink `#ec7fa3`, `--q3` yellow `#e9b949` and
`--q4` orange `#ee9560`, mapped to `--p1`…`--p4`. Life (`[data-v2-mode='life']` on `<html>`) rotates
the mapping (pink first) and warms `--surface` to `#f5f2ee` (dark `#201d1a`). `--accent-bright` is
`--p1`; `--accent` is `--p1` mixed 78% with black (60% with white in dark mode) so text stays legible.

Each tile and paper takes the next palette colour as `--tc` (`:nth-child(4n+…)`). Its frame gets a 7%
tint of `--tc` over `--surface`, the graphic's ink is `--ink` mixed with 28% `--tc`, and the graphic's
single accent element is the full `--tc`. Nothing else on the page is coloured, apart from `--accent`
on hover and focus, the availability dot, the active view-switch dot, the current role's timeline bar,
and the award note. Life photos share one warm grade (`.photo-grade`).

### Typography

One family: **Inter** (variable, weights 400–600). **JetBrains Mono** 400 only for code in articles.

| Token | Size | Role |
| --- | --- | --- |
| `--text-xs` | 12px | Metadata, captions, labels, tile details |
| `--text-sm` | 13px | Secondary text, controls, list descriptions |
| `--text-md` | 15px | Body, panel headings, tile and list titles |
| `--text-lg` | 17px | `h3`, ledes, hero text |
| `--text-xl` | 19–22px | `h2` in articles |
| `--text-section` | 20–26px | Larger section headings, the contact email |
| `--text-2xl` | 26–34px | `h1` (article titles) |
| `--text-display` | 32–48px | Page titles such as "Writing" |
| `--text-hero` | 48–112px | Hero name, 600 weight, −0.045em, line height 0.95 |

Headings use 500, except the hero name, panel headings and item titles, which use 600. Metadata is
sentence case in `--muted` with tabular numerals. Nothing is uppercase or letter-spaced.

### Spacing

`--space-1`…`--space-8`: 4, 8, 12, 16, 18, 24, 32, 44px. Gaps between homepage sections are larger
and fluid (`clamp(4rem, 7vw, 6.5rem)`); gaps inside a panel stay at `--space-2`…`--space-5`.

### Layout

| Token | Value | Use |
| --- | --- | --- |
| `--width-page` | 920px | The text column on writing pages |
| `--width-grid` | 1312px | The homepage column (`.layout-wide`) |
| `--width-text` | 736px | Cap for list-row descriptions |
| `--width-wide` | 760px | Article header and article images |
| `--measure` | 600px | Running text and ledes |
| `--meta-col` | 96px | Left column of list rows |
| `--gutter` | 20–48px (`5vw`) | Page side margins |
| `--header-height` | 52px | Sticky header; also drives `scroll-padding-top` |

The homepage passes `wide` to `V2Layout`, which sets `--width-page` to `--width-grid`, so header,
hero, sections and footer share one 1312px edge. Running text keeps its own caps. Writing pages keep
the centered 920px column. `body` clips horizontal overflow.

### Shape and motion

- Radii: `--radius-sm` 4px (covers, code), `--radius` 8px (every frame), `--radius-pill` (buttons,
  view switch).
- Transitions are 150ms on colour, background and border. Data graphics draw in once with a
  left-to-right wipe when they scroll into view; hovering a tile dims its graphic's ink so the accent
  stands out, and the availability dot pulses. `prefers-reduced-motion` turns all of this off.

## Grid and breakpoints

- **Hero:** `minmax(0, 1fr) | minmax(14rem, 27rem)` with a 44px gap. The copy is vertically centered;
  the cut-out portrait is bottom-aligned so it stands on the first panel's rule. The hero gets its
  height from spacing between its parts (larger above 860px), never from larger parts.
- **Work view:** one full-width Selected work band (`.work-band`) with four groups, each under a
  small `.group-head` (muted label, link on the right): *Projects* (six `.tiles--work` tiles, three
  across, an 8rem thumbnail beside title and one line, links below), *Publications* (three
  `.items--cols` papers), then a `.work-pair` of *Open-source tools* (2fr, rows spread so the column
  ends level) beside *Writing* (1fr, the latest two posts). Then `.dense--work`, a 12-column grid
  with Experience & education and Life outside work at full width.
- **Life view:** `.dense--life`, also 12 columns: A bit about me as a four-column photo band, then
  Music, Horror movie night and Writing as three `.panel--third`s, then On my shelves full width.
- **Inside full-width sections** content sits in its own columns: papers in three (`.items--cols`),
  earlier papers in four, roles and degrees in three (`.entries--cols`, `--thirds`), and tools in
  two (`.mini--cols`).

| Breakpoint | Changes |
| --- | --- |
| ≤ 1000px | The article contents list is hidden |
| ≤ 960px | Both 12-column grids become one column; papers become thumbnail rows; column lists drop to two; Life stories 2×2 |
| ≤ 860px | Hero portrait column narrows |
| ≤ 720px | Navigation collapses into a menu panel; work tiles two across |
| ≤ 600px | Everything is one column; work tiles, papers and stories are 104px-thumbnail rows; the hero puts name and lede beside a 3:4 tinted portrait tile; Life band photos 2×2 |
| ≤ 380px | Tighter header controls |

## Components

### Header and navigation

- Sticky, 52px tall, translucent `--paper` with a blur and a bottom hairline.
- Left: wordmark "Johannes Roth". Right: nav links (`--secondary`, current page in `--ink`), the view
  switch and the theme toggle.
- Nav links follow the view: Work shows *Projects, Research, Writing, CV*; Life shows *About,
  Shelves, Writing, CV*.
- At ≤ 720px the links move into a full-width panel opened by a menu button. Escape and link clicks
  close it.

### View switch

A segmented control: `--surface` pill track, two segments, the active one on `--raised` with its 6px
dot filled with the accent. It links to `#work` and `#life`. The head script sets the mode before
first paint; the layout script syncs `aria-current`, `hidden` and `inert`, and moves focus to the
visible `h1` when focus was inside the hidden view.

### Buttons and links

- `.button`: pill with a `--line-strong` border; `.button--primary` fills with `--ink` and turns
  `--accent` on hover. Each hero has one of each.
- `.link`: standalone text link with a `--line-strong` underline that turns accent on hover.
- **Arrow rule:** `.link`s to `http` or `.pdf` get a muted `↗` from CSS. Internal and mail links,
  nav items, buttons and list-row titles have none.
- `.stretched` makes a whole tile or row clickable through one link, so each has one tab stop.

### Hero

`h1` at `--text-hero` → lede → secondary text (max 38rem) → button pair → optional status line with
the accent dot. No eyebrow, no "now" row. Work uses the Oxford-shirt portrait, Life the climbing
portrait; both are transparent 4:5 cut-outs.

### Panels

`.panel` is every homepage section: a `--line-strong` top rule, then `.panel-head` (15px/600 `h2`, an
optional muted count, an optional right-aligned `.link`), an optional `.panel-lede`, and the body.

### Tiles

`.tile` (Selected work) is a flex column: a 4:3 tinted `.frame` with the graphic → 15px/600 `h3` →
`.card-text` → 12px `.card-detail` → `.item-links`, pushed to the bottom so links line up across the
row. Tiles carry no stats lines or labels; all six projects look the same, whoever led them.

### Writing rows

`.posts` lists the latest posts as `.post` rows: a 5rem 4:3 `.post-thumb` (a mask graphic from the
post's own data, or a book cover) beside the date, title and description. Thumbnails are mapped by slug
in `postThumbs` in `index.astro`; a post without one spans the full row.

### Tool icons

Open-source tools (`.mini--icons`) carry a 32px `.tool-icon` beside each name: a tinted square with
a schematic two-layer mask (`tool-<repo>-ink.png`, `-accent.png`, from `tool_icons()` in
`scripts/card_graphics.py`), coloured by the same `--tc` rules as tiles. At that size they are marks
of what each tool does (a waveform, job bars, a searchlight sphere), not plots of real data.

### Project dialogs

A tile's `More` button (`.more-button`, `data-dialog="<id>"`) opens a native `<dialog
class="project-dialog">` (`src/scripts/project-dialogs.ts`): the project's figure large and still
explorable, its title and one-line description, then three short sections (*What it is*, *What I
did*, *What came out of it*) and its links. Escape, the close button and a backdrop click close it;
the page behind does not scroll. Every tile has one, so tiles carry no `.card-detail` line. Tiles
and dialogs render from the `projects` list in `index.astro`, so each project is written once.

### Items

`.item` (papers) is a thumbnail beside text: venue line (`.venue`: venue in `--ink`, then year and
note), title, authors, summary and an optional `.award-note`. In `.items--cols` (three across) a 7.5rem thumbnail sits beside venue, title and authors, and the summary runs below both, so neither leaves empty space next to the other.

### List rows

`.entry`: `.entry-meta` (date) in the 96px meta column beside `.entry-title` and `.entry-text`,
separated by hairlines. In `.entries--cols` the date sits above the title and rows have no rules.

### No skills list

There is no skills section, tools row or per-role tags. Tools are named in the text of the role or
project they were used in, and the full CV (linked from the Experience & education header) carries
the keyword list. Degrees follow the roles under a `.panel-sub` "Education" label.

### Timeline

The timeline shares `.exp-top` with the degrees it charts (1.5fr | 1fr); its rows spread so it
ends level with them. The roles follow at full width.


Experience opens with `.timeline`: one row per role or degree (label | track) on a shared 2014–now
axis with year ticks. Bars are 38% ink, the current role `--accent-bright`, degrees hatched.

### Frames and data graphics

`.frame` is the only media container: 8px radius, `--surface` background, `overflow: hidden`.

Tiles and papers use figures drawn from each project's real data instead of photos or logos: hex
halftone dots of the Horrorverse atlas, the Conwell replication as a forest plot of original against replicated effects, a colour contact sheet of ReLAION photos (the one real-photo
tile, `relaion-photos.webp`), a LAION-fMRI brain slice with selective regions, the re:vision model
scores as fine bars, a pooled thingsvision similarity matrix, and per-paper figures. Most are two
alpha masks in `public/v2/graphics/` (`<name>-ink.png`, `<name>-accent.png`) painted through CSS
`mask` so they follow theme and palette, each with exactly one accent element.
`scripts/card_graphics.py` regenerates them from data outside this repo.

`src/scripts/graphics.ts` makes some explorable with a mouse: `data-hover="<name>"` loads
`<name>-hover.json` and labels the nearest point (films on the atlas, models on re:vision, category
pairs on the matrix); `data-scrub="laion-sprite"` scrubs a 16-frame sprite of brain slices with the
pointer. Touch devices keep the static image.

### Photo bands

`.life-band` (Life outside work, on Work) puts a short text in the first of five columns and the four
life photos in the rest, lined up with the Selected work tiles. `.stories--band` (A bit about me, on
Life) shows the same four stories as four columns, photo on top.

### Shelves

Music (Spotify embed) and Horror movie night (the atlas graphic) are 152px media blocks. The cover
wall has "Reading now" (accent-ringed covers) and one dense "Loved" wall with title, author and
category as tooltip and alt text. "Books I found okay" stays in a `.disclosure`.

### Disclosures

`.disclosure` is a full-width summary row with a trailing `+`/`−` on native `<details>`.

### Contact and footer

`.contact-strip` closes both views: "Say hi", then one row with the email, a line of context, the
availability status and profile links. The footer is a muted row with copyright, location and "Back to
top".

### Writing index

"A century of fear" is an interactive essay: its post has an empty body, and `[slug].astro` renders
`src/components/CenturyOfFear.astro` instead (data in `public/writing/a-century-of-fear/`, refreshed
by `scripts/century_of_fear_data.py`; styles in `src/styles/century-of-fear.css`, with its own
categorical chart palette). Its reading time comes from `postMinutes()` in `src/data/posts.ts`.

Posts with a `link` in their front matter are pieces published elsewhere: they get no article page, open the external page in a new tab, and show the host
("On horrorverse.jroth.space") instead of a reading time. The CMS has an optional "External link"
field for this.

`.page-head--display` (`h1` at `--text-display`, 20px lede), then posts grouped by year: the year sits
in the 120px meta column, and each post has a 20px title, a secondary description, and a 13px date and
reading time. Each post is fully clickable; the title turns accent on hover.

### Article

- Header (max `--width-wide`): back link → `h1` → 20px description lede → 13px date and reading time
  beside tag `.pills`, closed by a hairline 48px above the text.
- Posts with three or more `h2`s get a sticky contents list in the right column above 1000px. Prose
  then keeps `--measure` for everything, including images, and the entry for the section in view is
  marked with an accent rule.
- `.prose`: 17px/1.75 Inter. Text blocks are capped at `--measure`, while images, image rows, and
  figures can widen to `--width-wide`. Paragraph spacing is 1.25em, `h2` sits 2em above and `h3`
  1.8em above, and both clear floats. Links have a 55%-accent underline and turn accent on hover.
  Blockquotes use a 2px `--line-strong` rule. Code uses JetBrains Mono at 0.875em on `--surface`.
  Tables scroll horizontally. Images have an 8px radius and a 1px `--line` ring.
- `.image-row` is a two-column grid (one column at ≤ 600px) with 13px muted captions.
  `.image-float-right` images float right within the text measure at `min(180px, 40%)` and stack
  at ≤ 600px.
- Image enlargement: the article script wraps each non-linked prose image in a zoom-in button and
  carries the float class across. The `<dialog>` uses `--raised`, an 8px radius, a 72% black
  backdrop, and a circular close button. It closes on the button, on a backdrop click, or with Escape.
- Footer (max `--measure`): hairline, older and newer post links (13px label over a 500-weight
  title), then "All writing" and "Have a thought? Say hi".

## Interaction and accessibility

- Focus: a 2px `--accent` outline at a 3px offset on every focusable element. Programmatic focus on
  view headings shows no ring.
- Hover changes color only, except the surface fills on buttons and icon buttons, which are limited
  to `(hover: hover)` devices.
- Skip link, `inert` on the hidden view, `aria-pressed` on the theme toggle, `aria-expanded` on the
  menu, and `aria-current` on the active view and page are all kept.
- Theme: `data-theme` on `<html>` is persisted in `localStorage` under `v2-theme`, and every color
  token has a dark value.

## Adding to the system

- New homepage sections are `.panel`s placed in the view's 12-column grid: full width when they
  carry figures, paired with a section of similar weight when they are short text.
- New dated or indexed items are `.entry` rows. New visual items are tiles or items with a tinted
  `.frame` and a graphic drawn from real data.
- Sizes come from the `--text-*` steps; spacing comes from `--space-*`. Colour comes only from the palette, via `--tc`.
- Labels are 13px sentence-case `.meta`. Arrows follow the arrow rule above.

## Published routes

The homepage is `/`, writing is `/blog`, and the editor is `/admin`. The `/v2` routes render the same
components with canonical links to the main routes. `/about`, `/now`, and `/projects` redirect to the
corresponding homepage sections.
