# targetFunctions

Open, close and toggle elements by name — straight from markup, no component
state. One file, no dependencies, framework-agnostic.

```html
<button data-pg-target-functions="toggle-menu">Menu</button>

<aside data-pg-target="menu" data-pg-active="false">…</aside>
```

```ts
import { initTargetFunctions } from "./targetFunctions";

initTargetFunctions();
```

## Files

| File              | For                                                              |
| ----------------- | ---------------------------------------------------------------- |
| `index.ts`        | TypeScript source — import it directly in a TS / bundler project |
| `dist/index.js`   | Compiled ES module — plain HTML, no build step                   |
| `dist/index.d.ts` | Types for `dist/index.js`                                        |

`dist/` is committed. After editing `index.ts`, rebuild it:

```sh
npx tsc index.ts --outDir dist --declaration --target es2020 --module es2020 --lib dom,es2020 --strict
```

## Attributes

| Attribute                  | On      | Meaning                                                       |
| -------------------------- | ------- | ------------------------------------------------------------- |
| `data-pg-target-functions` | trigger | Commands to run on click, space separated                     |
| `data-pg-target`           | target  | Name(s) of the target, space separated                        |
| `data-pg-active`           | target  | `"true"` or `"false"` — the state, written by targetFunctions |
| `data-pg-scroll-lock`      | target  | `"true"` → lock the page while this target is open            |

Style the open state with the attribute, not a class:

```css
[data-pg-target="menu"][data-pg-active="true"] {
    transform: none;
}
```

With Tailwind: `data-[pg-active=true]:translate-x-0`.

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
want called when a `data-pg-scroll-lock="true"` target opens and closes:

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

Targets with `data-pg-scroll-lock="true"` are treated as dialogs:

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

JSX sets the starting value (`data-pg-active="false"`) and must not change it
afterwards; from then on targetFunctions owns it. If a re-render writes a
different value, React wins and the state is lost.

See [`examples/react.tsx`](examples/react.tsx).

## Limits

- Target names must not contain `-` — commands are split on it.
- One listener on `document` handles every trigger, including ones rendered
  later. Calling `initTargetFunctions` twice adds a second listener; call it
  once.
