# Note

Notes in algebraic geometry, written to be read again.

**Live site:** https://username1380068.github.io/Note/

## Layout

| path | what |
|:--|:--|
| `site/` | the published site — plain HTML and CSS, no build step, no dependencies |
| `theorems/` | note sources |
| `_quarto.yml` | build config; copies `site/` into the deploy output |

## How publishing works

Push to `main`. GitHub Actions runs, copies `site/` into `_site/`, and deploys it to Pages.
The build takes about a minute; if it fails, the previously deployed version stays online.

## Editing

The site is two files:

- `site/index.html` — the landing page: navigation, the note list, the easter egg
- `site/notes/negativity.html` — the Negativity Lemma page

Both are self-contained: CSS is inline, math is MathML, nothing loads from a CDN.
