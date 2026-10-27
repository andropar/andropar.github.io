# V2 design system

This document describes the system implemented in `src/styles/v2.css` and used by
`src/layouts/V2Layout.astro`, `src/pages/index.astro`, `src/pages/blog/index.astro`, and
`src/pages/blog/[slug].astro`. Every value below exists as a CSS custom property or a named
component class in that stylesheet.

## Direction

The site is a quiet editorial page: one sans-serif family, a 920px text column with visual elements
(card grids, photo rows) widening to 1200px, hairline rules between sections, two full-bleed surface
bands for rhythm, neutral paper tones, and one accent per side: deep green on Work, terracotta on Life.
Personality comes from the writing, the two portraits, the personal photography, and data graphics drawn
from the projects themselves. Work and Life use the same hero, section,
card, and list components, so both views share one visual language. The
writing index and articles use the same header, type scale, list rows, and link styles.

The two hero bodies share the height of the taller body. The layout measures their natural size
after fonts load and whenever the page width changes, so switching Work/Life keeps the next section
at the same vertical position on desktop and mobile.

## Tokens

### Color

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--paper` | `#fbfaf8` | `#141513` | Page background, header (92% with blur) |
| `--surface` | `#f1f0ec` | `#1d1f1c` | Media frames, view-switch track, code, hover fills |
| `--raised` | `#ffffff` | `#242622` | Active view-switch segment, image dialog |
| `--ink` | `#1c1d1a` | `#ecebe6` | Headings, body, primary button fill |
| `--secondary` | `#4d4f49` | `#bdbcb4` | Descriptions, ledes, nav links |
| `--muted` | `#6b6d66` | `#94938b` | Metadata, dates, captions, arrows, footer |
| `--line` | `#e3e1db` | `#2e302c` | Section rules, list rows, image hairlines |
| `--line-strong` | `#cbc8c0` | `#464942` | Button borders, link underlines, blockquote rule |
| `--accent` | `#34604a` | `#9fc4a8` | Hover color, focus ring, primary button hover, status dot |
| `--on-ink` | `#fbfaf8` | `#141513` | Text on ink or accent fills |

The Life view (`[data-v2-mode='life']` on `<html>`) overrides three tokens: `--paper` `#fbf8f4` /
`#161412`, `--surface` `#f3efe9` / `#201d1a`, and `--accent` terracotta `#a14d2c` / `#e2a07f`. The body
background fades between them over 300ms.

The accent appears on interaction (hover, focus), the availability dot, the dot of the active Work/Life
segment, the current role's timeline bar, the award note, the "Reading now" cover ring, the active
article contents entry, and as the single highlight in each data graphic. Life photos share one warm
grade (`.photo-grade`: slight sepia, lower saturation and contrast; darker in dark mode). Text colors meet WCAG AA on `--paper`; `--muted` is about
5:1 in light mode and 6:1 in dark mode.

### Typography

One family: **Inter** (Google Fonts, variable `opsz` 14–32 and weights 400–600, roman and italic).
**JetBrains Mono** 400 is used only for real code in articles.

| Token | Size | Role |
| --- | --- | --- |
| `--text-xs` | 13px | Metadata, dates, captions, view switch, footer, back links |
| `--text-sm` | 15px | Secondary text, nav links, buttons, standalone links, list descriptions |
| `--text-md` | 17px | Body text, article prose, list-row titles (`.entry-title`) |
| `--text-lg` | 20px | `h3`, hero lede, page and article ledes, contact email |
| `--text-xl` | 24–28px fluid | `h2` section titles, article `h2` |
| `--text-2xl` | 32–44px fluid | `h1` (article titles) |
| `--text-display` | 40–72px fluid | Page titles such as "Writing" |
| `--text-hero` | 44–96px fluid | Hero name, 600 weight, −0.045em, line height 0.95 |

Rules:

- All headings use weight 500, except the hero name (600). Tracking tightens with size: `h1` −0.022em, `h2` −0.016em,
  `h3` −0.01em. Headings use `text-wrap: balance`; paragraphs use `text-wrap: pretty`.
- Body text is 400. `strong` is 600. Nothing on the site is set in uppercase or letter-spaced.
- Line height is 1.65 for UI body text, 1.75 for article prose, 1.1–1.3 for headings, and 1.5 for
  metadata.
- Metadata (`.meta`, `.entry-meta`) is 13px sentence case in `--muted` with tabular numerals, so
  years and date ranges align in columns.

### Spacing

A 4px-based scale:

| Token | Value | Typical use |
| --- | --- | --- |
| `--space-1` | 4px | Title-to-description gap in list rows |
| `--space-2` | 8px | Meta-to-heading, heading-to-text |
| `--space-3` | 12px | Button groups, h1-to-lede |
| `--space-4` | 16px | Media-to-text, disclosure padding, card footer offset |
| `--space-5` | 24px | List-row padding, link-row gaps |
| `--space-6` | 32px | Column gutters, section heading to content, hero actions |
| `--space-7` | 48px | Card-grid row gap, sub-blocks inside a section |
| `--space-8` | 64px | Hero top padding, article footer offset |
| `--section-space` | 48–64px fluid | Vertical padding of every `.section` |

### Layout

| Token | Value | Use |
| --- | --- | --- |
| `--width-page` | 920px | The text column: header, main, footer |
| `--width-grid` | 1200px | `.breakout` elements: project and paper grids, Life story rows |
| `--width-text` | 736px | Cap for list-row descriptions |
| `--width-wide` | 760px | Article header and article images |
| `--measure` | 600px | Running text: article prose, ledes, card text on wide cards (about 68 characters at 17px) |
| `--meta-col` | 120px | Left column of every list row |
| `--gutter` | 20–48px (`5vw`) | Page side margins |
| `--header-height` | 64px | Sticky header; also drives `scroll-padding-top` |

`.container` is `min(var(--width-page), 100% - 2 * var(--gutter))`, centered. Content inside the
column is left-aligned on a shared edge; article text keeps that edge and is limited to `--measure`.
`.breakout` widens an element to `min(--width-grid, 100vw − 2 × gutter)`, centered on the column, so
headings and text keep the column edge while visuals use more of wide screens. `body` clips horizontal
overflow so full-bleed elements never cause sideways scrolling.

`.section--band` paints a full-bleed `--surface` band behind a section (Selected work on Work, On my
shelves on Life). It drops the section's hairline and the next section's, and frames and covers
inside it switch to `--paper`.

### Shape and motion

- Radii: `--radius-sm` 4px (inline code, book covers), `--radius` 8px (every media frame, code block,
  image, dialog), `--radius-pill` (buttons, view switch, icon buttons). Archive thumbnails use 2px.
- Borders are 1px. Sections, list rows, and disclosures are separated by `--line` hairlines.
  Cards have no border or shadow; their media frame carries the shape.
- Transitions are 150ms on color, background, and border only. `prefers-reduced-motion` turns off
  smooth scrolling and all transitions.

## Grid and breakpoints

- **Page column:** 920px max, with `.breakout` visuals up to 1200px. Sections stack vertically, each
  with a top hairline (or a surface band) and `--section-space` padding.
- **Hero:** two columns, `minmax(0, 1fr)` copy and a `minmax(14rem, 25rem)` portrait, 64px gap. The
  copy is vertically centered; the portrait is bottom-aligned with no padding below, so the cut-out
  stands on the next section's top edge.
- **Card grid:** two equal `minmax(0, 1fr)` columns, 32px column gap, 48px row gap. Selected work
  (`.card-grid--projects`) uses a six-column track: two headline cards span three columns each, and
  three `.card--small` cards span two. Small cards have no `.card-detail`. At ≤ 720px all five stack.
- **List rows (`.entry`):** `120px | minmax(0, 1fr)`, 32px column gap, baseline-aligned so the date
  sits on the title's first line.
- **Focus areas:** three equal columns (two at ≤ 860px), each topped by a hairline, with 17px titles and
  15px muted descriptions.
- **Paper cards (`.card-grid--papers`):** three equal columns with 4:3 graphics; one column at ≤ 600px.
- **Life stories (`.life-stories`):** one row per story, photo (1.3fr) and text (1fr) alternating sides.
- **Cover rows:** `120px | 1fr` like list rows, with wrapping 48px covers.
- **Book archive:** intrinsic `repeat(auto-fill, minmax(min(100%, 13rem), 1fr))`, which gives four
  columns at full width and fewer as space shrinks.

| Breakpoint | Changes |
| --- | --- |
| ≤ 1000px | The article contents list is hidden and prose returns to the single-column layout |
| ≤ 860px | Hero portrait column 10–15rem with a 48px gap; focus areas drop to two columns |
| ≤ 720px | Navigation collapses into a menu panel; project cards stack into one column with 16:10 media |
| ≤ 600px | Section headings and their action links, hero, card grids, focus areas, shelves, the Life teaser, Life stories, cover rows, year groups, list rows, and article image rows stack into one column; the hero portrait moves above the name as a square up to 240px wide on its own hairline; the floated article image stops floating |
| ≤ 380px | 15px wordmark and tighter header controls |

## Components

### Header and navigation

- Sticky, 64px tall, translucent `--paper` with a 12px blur and a bottom hairline.
- Left: wordmark "Johannes Roth" at 17px/500. Right: nav links (15px, `--secondary`, hover and
  `aria-current="page"` in `--ink`), then the view switch and the theme toggle.
- Nav links are context-aware: Work shows *Projects, Research, Writing, CV*; Life shows
  *About, Shelves, Writing, CV*. On writing pages, *Writing* carries `aria-current="page"`.
- At ≤ 720px the links move into a full-width panel below the header (17px rows separated by
  hairlines), opened by a two-line menu button that turns into an X. Escape and link clicks close it.
  CV stays reachable in that panel.

### View switch

A segmented control: `--surface` pill track, two 13px/500 segments, and the active segment on
`--raised` with a hairline ring. Each segment reserves a 6px dot; only the active one is filled with
the accent, so the control keeps its width when switching. It links to `#work` and `#life`. The inline head script sets the
mode before first paint; the layout script syncs `aria-current`, `hidden`, and `inert`, and moves
focus to the visible `h1` when focus was inside the hidden view. The Work and Life links open their
respective views at the top of the page.

### Buttons and links

- `.button`: 40px tall pill, 18px horizontal padding, 15px/500, `--line-strong` border. Hover
  (pointer devices) fills with `--surface`.
- `.button--primary`: `--ink` fill with `--on-ink` text. Hover changes the fill to `--accent`.
  Each hero has one primary and one secondary button.
- `.link`: standalone text link, 15px/500 `--ink`, underline in `--line-strong` at 0.25em offset.
  Hover turns text and underline `--accent`.
- **Arrow rule:** `.link` elements whose `href` starts with `http` or ends in `.pdf` get a `↗`
  from CSS, in `--muted` and hidden from assistive technology. Internal links, mail links, nav
  items, buttons, and list-row titles have no arrows. `.link-back` (13px, muted, leading `←`) is the
  only other arrow and is used once, above article titles.
- `.icon-button`: 36px circular hit area for the theme toggle, menu, and dialog close.
- `.stretched`: makes a card or row clickable through a `::before` overlay on its single link, so
  each card or row has one tab stop. It is used for project cards, writing rows, the re:vision row,
  and the Life teaser.

### Section heading

`.section-head` is a two-column grid: `h2` on the left, an optional `.link` on the right
(baseline-aligned), and an optional `.section-lede` (17px, `--secondary`, max `--measure`) spanning
the next row. At 600px and below, headings and action links stack on the same left edge. The
component sits 32px above the section content, with section titles in sentence case.

### Hero

Used by Work and Life alike: `h1` at `--text-hero` → 24–28px lede → 20px secondary text (max 36rem) →
button pair → optional status line with the 6px accent dot. The portrait is a transparent cut-out at
4:5 with `object-position: 50% 0` and no frame background, standing on the next section's edge. Work uses the
original-face Oxford-shirt portrait; Life uses the casual climbing portrait.

### Frames and media

`.frame` is the only media container: 8px radius, `--surface` background, `overflow: hidden`, and
child images set to `object-fit: cover`. Aspect ratios:

| Context | Ratio |
| --- | --- |
| Hero portrait | 4:5 (1:1 at ≤ 600px) |
| Headline project cards | 16:10 |
| Small project cards, paper cards | 4:3 (small project cards 16:10 at ≤ 720px) |
| Life story photos | 4:3, with per-photo `object-position` |
| Movie-night graphic | 152px tall, matching the Spotify embed beside it |
| Life teaser photo | 3:2 |
| Book covers | 2:3 |

Project and paper cards use data graphics instead of photos or logos. Each is drawn from that project's
real data (the Horrorverse atlas, a dithered ReLAION contact sheet, model scores from the LAION-fMRI
replication, a brain slice with face- and scene-selective cortex, a ResNet-50 similarity matrix; for
papers, a 10-model rerun of the universal-dimensions method, the sampling paper's coverage map rebuilt
from its published figure, and LAION-fMRI's commit history) and stored as two
alpha masks in `public/v2/graphics/`: `<name>-ink.png` and `<name>-accent.png`. `.graphic` paints them
with `--ink` and `--accent` through CSS `mask`, inset 16px (12px for the contact sheet) and contained
in the frame, so they follow the theme. Each graphic has exactly one accent element. ReLAION has
`-dark` masks with a positive dither, because light ink on dark paper would show the photos as
negatives. `scripts/card_graphics.py` regenerates the masks; it reads data outside this repo.

### Cards

`.card` is a flex column: frame → `h3` (20px) → `.card-text` (17px
secondary) → optional `.card-detail` (15px secondary) → optional `.card-footer`. The footer is pushed
to the bottom so footers line up across a row; it holds only the destination `.link`. Paper cards add a
13px year and venue line above a 17px title, authors, the award note and the "About this paper" toggle.

### List rows

`.entry` is the row pattern for the remaining publication, earlier publications, roles, education,
and writing on Work and Life. Every row has a 13px
`.entry-meta` (year, date range, or month), a 17px/500 `.entry-title`, and 15px `.entry-text` lines. Publication notes such as
"Shared first author" or "Oral" are set inline in `--ink` within the venue line. Rows are separated
by top hairlines. Role and degree rows add a `.span-bar` under the date: a 2px track on a shared
2014–now scale with the span in `--ink` (the current one in `--accent`).

The CMBB Replication Award appears within its publication row as an `.award-note`: a small trophy,
13px text, a surface background, and a hairline border. Eyebrow labels above heroes and cards are
omitted; metadata carries dates, authors, contribution areas, and availability.

### Disclosures

- `.toggle`: inline, 13px muted summary with a trailing `+`/`−`, used for "About this paper".
- `.disclosure`: full-width 15px/500 summary row with a top hairline and a trailing `+`/`−`, used
  for "Earlier publications" and "Books I found okay".

Both use native `<details>`, so they work with the keyboard and without JavaScript.

### Work-specific compositions

- **Selected work:** on a surface band; Horrorverse and ReLAION-natural as headline cards, then
  re:vision, LAION-fMRI and thingsvision as small cards.
- **Expertise:** `<dl class="focus-grid">` with six areas, followed by "Methods & tools": a wrapping
  row of `.pills` (13px, hairline border, pill radius) listing the skills that used to sit on cards.
- **Research:** the three first- or shared-first-author papers as graphic cards, the remaining paper
  as a list row, then the "Earlier publications" disclosure.
- **Experience & education:** role dates and descriptions follow `cv.tex` and the linked CV. Education
  uses the same row pattern below a subsection heading.
- **Life outside work:** `.split` with a 3:2 photo and copy (h2, text, secondary button). The whole
  block links to `#life`.

### Life-specific compositions

- **A bit about me:** a photo essay; each story is a graded photo beside a 24–28px heading and text,
  alternating sides.
- **On my shelves:** on a surface band. Music (Spotify embed) and Horror movie night (the Horrorverse
  atlas graphic, terracotta on Life) sit side by side at matching 152px heights. Below, "Books" is a
  cover wall: one row per group, "Reading now" first with accent-ringed covers, 48px covers with the
  title and author as a tooltip and alt text. Missing covers show the title on `--surface`. "Books I
  found okay" stays in a disclosure.
- **Writing:** the same label and list rows as Work's writing section.

### Contact and footer

Contact is shared by both views: `h2` "Say hi" with a lede, the email at 20px/500 with an
underline, and a `.link-row` of external profiles. The footer is a 13px muted row with copyright and
location on the left and "Back to top" on the right, above a hairline.

### Writing index

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

- New sections use `.section` and `.section-head`, and pick an existing body pattern: card grid,
  list rows, focus grid, or split.
- New dated or indexed items are `.entry` rows. New visual items are `.card`s with a `.frame`.
- Sizes come from the six `--text-*` steps; spacing comes from `--space-*`.
- Labels are 13px sentence-case `.meta`. Arrows follow the arrow rule above.

## Published routes

The homepage is `/`, writing is `/blog`, and the editor is `/admin`. The `/v2` routes render the same
components with canonical links to the main routes. `/about`, `/now`, and `/projects` redirect to the
corresponding homepage sections.
