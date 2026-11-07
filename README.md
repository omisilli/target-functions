# targetFunctions

Open, close and toggle elements by name — straight from markup, no component
state. One file, no dependencies, framework-agnostic.

```html
<button data-pg-target-functions="toggle-menu">Menu</button>

<aside data-pg-target="menu" data-pg-target-active="false">…</aside>
```

```sh
npm install github:omisilli/target-functions#v3.2.0
```

```ts
import { initTargetFunctions } from "@plusguard/target-functions";
import "@plusguard/target-functions/index.css";

initTargetFunctions();
```

### Without a build step

Load it straight from jsDelivr — no install, and the page works when opened
by double-clicking:

```html
<link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/gh/omisilli/target-functions@v3.2.0/index.css"
/>

<script type="module">
    import { initTargetFunctions } from "https://cdn.jsdelivr.net/gh/omisilli/target-functions@v3.2.0/dist/index.js";

    initTargetFunctions();
</script>
```

Pin the version (`@v3.2.0`) on a live site. A pinned URL never changes;
`@3` follows the newest 3.x release.

## Files

| File              | For                                                              |
| ----------------- | ---------------------------------------------------------------- |
| `index.ts`        | TypeScript source — import it directly in a TS / bundler project |
| `index.css`       | The CSS half: the scroll lock                                    |
| `dist/index.js`   | Compiled ES module — plain HTML, no build step                   |
| `dist/index.d.ts` | Types for `dist/index.js`                                        |

Importing `dist/index.js` from your own files? Serve the page over HTTP —
browsers block module imports on `file://`.

`dist/` is committed. After editing `index.ts`, rebuild it:

```sh
npx -p typescript tsc index.ts --outDir dist --declaration --target es2020 --module es2020 --lib dom,es2020 --strict
```

## Attributes

| Attribute                    | On      | Meaning                                                       |
| ---------------------------- | ------- | ------------------------------------------------------------- |
| `data-pg-target-functions`   | trigger | Commands to run on click, space separated                     |
| `data-pg-target`             | target  | Name(s) of the target, space separated                        |
| `data-pg-target-active`      | target  | `"true"` or `"false"` — the state, written by targetFunctions |
| `data-pg-target-scroll-lock` | target  | `"true"` → lock the page while this target is open            |

Style the open state with the attribute, not a class:

```css
[data-pg-target="menu"][data-pg-target-active="true"] {
    transform: none;
}
```

With Tailwind: `data-[pg-target-active=true]:translate-x-0`.

Every attribute starts with `data-pg-target`, so none of them can collide
with another library's names.

## CSS

`index.css` holds one rule: the scroll lock (see below). How an open target
looks is your page's business — style it on `data-pg-target-active`.

## Commands

Run left to right, each one seeing the result of the one before.

| Command                | Effect                     |
| ---------------------- | -------------------------- |
| `open-X`               | Open every target named X  |
| `close-X`              | Close every target named X |
| `toggle-X`             | Flip every target named X  |
| `if-opened-A-open-B`   | If any A is open, open B   |
| `if-opened-A-close-B`  | If any A is open, close B  |
| `if-opened-A-toggle-B` | If any A is open, flip B   |
| `if-closed-A-…-B`      | Same, when no A is open    |
| `…-except-N`           | Any of the above, leaving out the targets named N |

```html
<!-- open the menu, and close search if it happens to be open -->
<button data-pg-target-functions="open-menu if-opened-search-close-search"></button>
```

Several elements may share a name — `close-menu` closes the drawer and its
backdrop together.

### Except

Any command may end in `-except-` and one or more names: the targets
carrying any of them are left out.

| Command                               | Effect                                         |
| ------------------------------------- | ---------------------------------------------- |
| `close-faq-except-s3`                 | Close every `faq` but `s3` — an accordion      |
| `toggle-faq-except-s3`                | Flip every `faq` but `s3`                      |
| `open-faq-except-s3-s4`               | Open every `faq` but `s3` and `s4`             |
| `toggle-panel-except-faq`             | Flip every `panel` that is not also a `faq`    |
| `if-opened-menu-close-faq-except-s3`  | The same, behind a condition                   |

Without it, every target with the name is reached — the button's own one
too. The exception is the button's, written where it is clicked: another
button may leave out something else, or nothing.

## Screen sizes

What a button does may differ by screen size: one question open at a time
on a computer, any number on a phone. The commands stay in the markup;
the page's CSS says which of them do **not** run at a given size, in
`--pg-target-skip` — on the button, or anything above it:

```css
/* Phones: the questions open freely — "close-faq" does not run. */
@media (width < 64rem) {
    .faq {
        --pg-target-skip: close-faq;
    }
}
```

With Tailwind, on the button or a container: `max-lg:[--pg-target-skip:close-faq]`.

- **Not set** — every command runs, at every size.
- **An entry matches a command, or its beginning, by whole words**:
  `close` skips every `close-…`; `close-faq` skips `close-faq` and
  `close-faq-except-s3`; neither touches `toggle-faq` or `if-closed-…`.
  For a conditional, name it: `if-opened-menu`.
- **Several**, space separated: `--pg-target-skip: close-faq open-menu`.
- **Only on phones** instead: put it in the computer's media query.

It is read at each click, so a resized window takes its new value at the
next one. A CSS variable, as in the other PlusGuard packages, so the
package never has to know a theme's breakpoints.

## Accordion

A question and its answer: the button toggles its own answer, and closes
the others — except its own.

```html
<div class="faq">
    <button class="faq-head" data-pg-target-functions="close-faq-except-s1 toggle-s1" aria-controls="s1">
        What is a target?
    </button>
    <div class="faq-body" id="s1" data-pg-target="s1 faq" data-pg-target-active="false">
        <div>Any element with data-pg-target.</div>
    </div>
    <!-- s2, s3 … the same -->
</div>
```

**One at a time on a computer, any number on a phone:** add
`--pg-target-skip: close-faq` to the phone's media query (see [Screen
sizes](#screen-sizes)). Any number everywhere: leave out the
`close-faq-except-…`.

**The opening, in CSS — no measuring.** The answer is a one-row grid whose
row grows from `0fr` to `1fr`; the extra `<div>` inside is what is
measured, by the browser. Content that changes later — a font loading, a
window resized — never leaves a stale height behind.

```css
.faq-body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.5s ease;
}
.faq-body > div {
    overflow: hidden;
}
.faq-body[data-pg-target-active="true"] {
    grid-template-rows: 1fr;
}
@media (prefers-reduced-motion: reduce) {
    .faq-body {
        transition: none;
    }
}
```

**A footer's columns: open on a computer, an accordion on a phone.** No
script for that: on a computer the CSS shows every body whatever its
state, and the heads stop being buttons.

```css
@media (width >= 64rem) {
    .footer-body {
        grid-template-rows: 1fr;
    }
    .footer-head {
        pointer-events: none;
    }
}
```

**Two columns on a computer, one on a phone.** Write each question twice
— in the left column, all of them; in the right, the even ones — and let
CSS show the halves on a computer, the whole left one on a phone. The
copies share their names, so they open and close together: a question
open on a computer is still open on a phone. A copy that is hidden with
`display: none` is not read out twice.

Escape and focus moves are kept for dialog-like targets (scroll lock), so
an accordion behaves like an accordion: Escape does not close it.

## Tabs, and an address that opens one

A tab bar is the accordion's one-at-a-time, with `open` instead of
`toggle` — a tab pressed twice stays open:

```html
<button data-pg-target-functions="close-tab-except-t1 open-t1" aria-controls="policies">Policies</button>
<button data-pg-target-functions="close-tab-except-t2 open-t2" aria-controls="procedures">Procedures</button>

<div id="policies"   data-pg-target="t1 tab" data-pg-target-active="true">…</div>
<div id="procedures" data-pg-target="t2 tab" data-pg-target-active="false">…</div>
```

```css
.tab[aria-expanded="true"] {
    border-bottom-color: currentColor;
}
.tab-panel[data-pg-target-active="false"] {
    display: none;
}
```

- **No `#` in the address:** the markup's state stands. Write the first
  panel open, as above, and the first tab shows.
- **`…/page#procedures`:** the panel with that id opens — through the
  button that opens it, so `close-tab-except-t2` closes the other tabs as a
  click would. Then the page goes to it, as the browser does with any
  `#id`; it could not while the panel was closed.
- **An id inside a closed target works too:** `#refunds`, a paragraph in a
  closed tab or a closed accordion answer, opens what it is in — tabs
  within tabs from the outside in — then goes to the paragraph.
- **A link on the page** to `#procedures` does the same: it runs on load and
  whenever the hash changes, so Back and Forward follow along.
- **A target no button opens** simply opens.

A tab that is a button leaves the address as it is. To write it there, so
the tab can be shared, let the anchor package write it — its "Tabs"
section.

## Scroll lock

While a `data-pg-target-scroll-lock="true"` target is open, the page stays
still. That is all CSS, in `index.css` — no callback, no locker to wire up:

```css
html:has([data-pg-target-scroll-lock="true"][data-pg-target-active="true"]) {
    overflow: clip;
}
```

- **Any number of them.** Open a drawer, then a search over it, close the
  drawer: the page stays locked until the last one has closed. The selector
  does the counting.
- **`clip`, not `hidden`:** a script cannot scroll the page either.
- **Lenis** catches the wheel itself, so an overflow rule alone does not stop
  it. Give it `autoToggle: true` (with its `lenis.css`): Lenis stops by itself
  while `<html>` cannot scroll, and starts again after.

```ts
new Lenis({ autoRaf: true, autoToggle: true });
```

Anything else that should notice the lock can read the same thing — the
page's overflow — without knowing about targetFunctions.

## Accessibility

Targets with `data-pg-target-scroll-lock="true"` are treated as dialogs:

- **Focus** moves to the first focusable element inside when it opens, and
  back to the button that opened it when it closes.
- **Escape** closes the one opened last.
- **`aria-expanded`** is kept in sync on disclosure buttons — those with
  exactly one plain `toggle-X` or `open-X`, alone or beside close
  commands and conditionals: an accordion's `close-faq-except-s3
  toggle-s3` tracks `s3`. Close buttons, and buttons that open two things,
  are left alone; they have no single expanded state. A name that reaches
  several targets counts as one: an "Open all" button, `open-answers`, is
  expanded while any answer is open — so give it no "pressed" look of its
  own.

Not included: a focus trap. While a drawer is open, Tab can still reach the
page behind it.

## React

Call `initTargetFunctions` once, in an effect — it returns its own cleanup:

```tsx
useEffect(() => initTargetFunctions(), []);
```

JSX sets the starting value (`data-pg-target-active="false"`) and must not
change it afterwards; from then on targetFunctions owns it. If a re-render writes a
different value, React wins and the state is lost.

See [`examples/react/Example.tsx`](examples/react/Example.tsx) — the drawer,
an accordion, `except` on chips, a site's footer, and tabs. A plain HTML version is in
[`examples/static/index.html`](examples/static/index.html): every command, a
drawer and a search, an accordion (one at a time on a computer, any number
on a phone), two columns on a computer and one on a phone, a footer open on
a computer and an accordion on a phone — the page's own, at its bottom:
five columns, one open at a time, an arrow turning as one opens —
`except` on chips, and tabs that `#procedures` in the address opens.

## Limits

- Target names must not contain `-` — commands are split on it — and
  `except` is no name: it is a word of the commands.
- One listener on `document` handles every trigger, including ones rendered
  later. Call `initTargetFunctions` once. If it is called again before the
  first cleanup runs (React remounting in development), only the newest call
  answers clicks, and the older cleanup does not switch it off.

## Upgrading from 2.x

The scroll lock moved into `index.css`, so `initTargetFunctions` takes no
options any more: drop `{ lock, unlock }` and whatever locker you passed in
(the old scrollLocker), import `index.css`, and with Lenis set
`autoToggle: true`.

## Upgrading from 1.x

Two attributes were renamed so every name starts with `data-pg-target`:

| 1.x                   | 2.x                          |
| --------------------- | ---------------------------- |
| `data-pg-active`      | `data-pg-target-active`      |
| `data-pg-scroll-lock` | `data-pg-target-scroll-lock` |

Rename them in your markup and CSS (Tailwind: `data-[pg-active=true]:` →
`data-[pg-target-active=true]:`), and import `index.css`.
