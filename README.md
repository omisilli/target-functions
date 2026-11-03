# targetFunctions

Open, close and toggle elements by name — straight from markup, no component
state. One file, no dependencies, framework-agnostic.

```html
<button data-pg-target-functions="toggle-menu">Menu</button>

<aside data-pg-target="menu" data-pg-target-active="false">…</aside>
```

```sh
npm install github:omisilli/target-functions#v2.0.0
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
    href="https://cdn.jsdelivr.net/gh/omisilli/target-functions@v2.0.0/index.css"
/>

<script type="module">
    import { initTargetFunctions } from "https://cdn.jsdelivr.net/gh/omisilli/target-functions@v2.0.0/dist/index.js";

    initTargetFunctions();
</script>
```

Pin the version (`@v2.0.0`) on a live site. A pinned URL never changes;
`@2` follows the newest 2.x release.

## Files

| File              | For                                                              |
| ----------------- | ---------------------------------------------------------------- |
| `index.ts`        | TypeScript source — import it directly in a TS / bundler project |
| `index.css`       | The CSS half — empty for now, see below                          |
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

`index.css` is empty: how an open target looks is your page's business.
Import it anyway. If the package ever needs CSS of its own, your page
already loads it and nothing changes on your side.

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

```html
<!-- open the menu, and close search if it happens to be open -->
<button data-pg-target-functions="open-menu if-opened-search-close-search"></button>
```

Several elements may share a name — `close-menu` closes the drawer and its
backdrop together.

## Scroll lock

targetFunctions does not lock the page itself. Pass the two callbacks you
want called when a `data-pg-target-scroll-lock="true"` target opens and closes:

```ts
initTargetFunctions({
    lock: (source) => (document.documentElement.style.overflow = "clip"),
    unlock: (source) => (document.documentElement.style.overflow = ""),
});
```

`source` is unique per target (`targetFunctions:menu`), so a locker that
counts holders can keep the page locked until every one of them has closed.
Without callbacks, those targets simply open without locking.

## Accessibility

Targets with `data-pg-target-scroll-lock="true"` are treated as dialogs:

- **Focus** moves to the first focusable element inside when it opens, and
  back to the button that opened it when it closes.
- **Escape** closes the one opened last.
- **`aria-expanded`** is kept in sync on disclosure buttons — a single
  `toggle-X` or `open-X`. Close buttons, chains and conditionals are left
  alone; they have no single expanded state.

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

See [`examples/react/Example.tsx`](examples/react/Example.tsx). A plain HTML
version is in [`examples/static/index.html`](examples/static/index.html).

## Limits

- Target names must not contain `-` — commands are split on it.
- One listener on `document` handles every trigger, including ones rendered
  later. Call `initTargetFunctions` once. If it is called again before the
  first cleanup runs (React remounting in development), only the newest call
  answers clicks, and the older cleanup does not switch it off.

## Upgrading from 1.x

Two attributes were renamed so every name starts with `data-pg-target`:

| 1.x                   | 2.x                          |
| --------------------- | ---------------------------- |
| `data-pg-active`      | `data-pg-target-active`      |
| `data-pg-scroll-lock` | `data-pg-target-scroll-lock` |

Rename them in your markup and CSS (Tailwind: `data-[pg-active=true]:` →
`data-[pg-target-active=true]:`), and import `index.css`.
