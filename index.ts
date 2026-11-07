/*
 * targetFunctions — open, close and toggle elements by name, from markup.
 *
 *   <button data-pg-target-functions="open-menu if-opened-menu-close-search">
 *   <aside  data-pg-target="menu"   data-pg-target-active="false" data-pg-target-scroll-lock="true">
 *   <div    data-pg-target="search" data-pg-target-active="false">
 *
 * Commands, space separated, run left to right against live state:
 *   open-X · close-X · toggle-X
 *   if-opened-A-<open|close|toggle>-B
 *   if-closed-A-<open|close|toggle>-B
 * Any of them may end in -except-N…: the targets named N are left out.
 *   close-faq-except-s3   every faq but s3 — an accordion
 *
 * Per screen size, a CSS variable on the button (or above it) names the
 * commands that do not run there — media queries welcome:
 *   @media (width < 64rem) { .faq { --pg-target-skip: close-faq; } }
 * An entry matches a command, or its beginning: "close" skips every
 * close-…, "close-faq" skips close-faq and close-faq-except-s3.
 *
 * State lives in ONE attribute, data-pg-target-active="true|false". The old
 * code kept it twice (data-qua-status plus the qua-active class) and every
 * write had to touch both.
 *
 * Every attribute starts with data-pg-target, so nothing here can collide
 * with another package's names.
 *
 * An address ending in #id opens what that id is, or is inside: a closed
 * target opens the way its own button opens it — a tab's
 * "close-tab-except-t2 open-t2" closes the other tabs too — and the page
 * then goes to #id, as the browser would have had it been open. On load,
 * and whenever the hash changes. With no hash, the markup's own state
 * stands: write the first tab open.
 *
 * Names are split on "-", so a target name must not contain one — and
 * "except" is a word of the commands, so it is no name either.
 *
 * No dependencies. The scroll lock is CSS: index.css keeps the page still
 * while a data-pg-target-scroll-lock="true" target is open — any number of
 * them, the page frees itself when the last one closes. With Lenis, its
 * autoToggle option stops Lenis by itself while the page is locked.
 *
 * React: JSX sets the starting value (data-pg-target-active="false") and
 * must not change it afterwards — from then on this file owns it. If a
 * re-render writes a different value, React wins and the state is lost.
 */

type Action = "open" | "close" | "toggle";

const TRIGGER = "data-pg-target-functions";
const TARGET = "data-pg-target";
const ACTIVE = "data-pg-target-active";
const SCROLL_LOCK = "data-pg-target-scroll-lock";
const SKIP = "--pg-target-skip";

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* A target may carry several names: data-pg-target="aside menu". */
function namesOf(el: HTMLElement): string[] {
    return (el.getAttribute(TARGET) ?? "").trim().split(/\s+/).filter(Boolean);
}

function targetsNamed(name: string): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(`[${TARGET}]`)).filter((el) =>
        namesOf(el).includes(name),
    );
}

function isActive(el: HTMLElement): boolean {
    return el.getAttribute(ACTIVE) === "true";
}

function locksScroll(el: HTMLElement): boolean {
    return el.getAttribute(SCROLL_LOCK) === "true";
}

function isAction(value: string | undefined): value is Action {
    return value === "open" || value === "close" || value === "toggle";
}

function commandsOf(trigger: HTMLElement): string[] {
    return (trigger.getAttribute(TRIGGER) ?? "").trim().split(/\s+/).filter(Boolean);
}

/* A command, taken apart: what it does, to which name, when, and which
   names it leaves out. null if it is not a command. */
type Command = {
    action: Action;
    name: string;
    when?: { opened: boolean; name: string };
    except: string[];
};

function parse(command: string): Command | null {
    const all = command.split("-");
    // Everything after "except" is the names left out.
    const at = all.indexOf("except");
    const parts = at === -1 ? all : all.slice(0, at);
    const except = at === -1 ? [] : all.slice(at + 1).filter(Boolean);
    if (at !== -1 && except.length === 0) return null;

    // open-X · close-X · toggle-X
    if (parts.length === 2 && isAction(parts[0]) && parts[1]) {
        return { action: parts[0], name: parts[1], except };
    }

    // if-opened-A-action-B · if-closed-A-action-B
    if (parts.length === 5 && parts[0] === "if" && isAction(parts[3]) && parts[2] && parts[4]) {
        if (parts[1] !== "opened" && parts[1] !== "closed") return null;
        return { action: parts[3], name: parts[4], when: { opened: parts[1] === "opened", name: parts[2] }, except };
    }
    return null;
}

/* The commands this button does not run at the screen size it is seen at:
   its --pg-target-skip, set by the page's CSS. */
function skippedBy(trigger: HTMLElement): string[] {
    return getComputedStyle(trigger).getPropertyValue(SKIP).trim().split(/\s+/).filter(Boolean);
}

/* "close" skips close-faq; "close-faq" skips close-faq-except-s3; neither
   skips closed-… or toggle-…: an entry matches whole words only. */
const skips = (entry: string, command: string): boolean => command === entry || command.startsWith(`${entry}-`);

/*
 * aria-expanded tells a screen reader whether the thing a button controls
 * is open. Set on disclosure buttons: those with exactly one plain
 * toggle-X or open-X — alone, or beside close commands and conditionals,
 * as an accordion's "close-faq-except-s3 toggle-s3". X is what the button
 * controls. A close button, or one that opens two things, has no single
 * "expanded" state, so those are left untouched.
 */
function ownTarget(trigger: HTMLElement): string | null {
    const opens = commandsOf(trigger)
        .map(parse)
        .filter((c): c is Command => !!c && !c.when && c.except.length === 0 && (c.action === "toggle" || c.action === "open"));
    return opens.length === 1 ? opens[0].name : null;
}

function syncAria(): void {
    document.querySelectorAll<HTMLElement>(`[${TRIGGER}]`).forEach((trigger) => {
        const name = ownTarget(trigger);
        if (!name) return;
        const open = targetsNamed(name).some(isActive);
        trigger.setAttribute("aria-expanded", String(open));
    });
}

/*
 * The instance that currently answers clicks. Only the newest call to
 * initTargetFunctions is live; an older one that has not been cleaned up yet
 * (React remounting in development, a route change) stays silent, so a
 * click never runs twice and a late cleanup cannot switch the newer one off.
 */
let live: object | null = null;

/* Start listening; returns the cleanup for a React effect. */
export function initTargetFunctions(): () => void {
    if (typeof document === "undefined") return () => {};

    const self = {};
    live = self;

    /*
     * Accessibility state, kept per call.
     *
     * A target that locks scroll behaves like a dialog — drawer, overlay,
     * dropdown — so it gets the dialog treatment: focus moves in when it
     * opens, goes back to the button that opened it when it closes, and
     * Escape closes the one opened last. Targets that do not lock scroll
     * (accordions, tabs) are left alone; Escape closing a tab panel would
     * be wrong.
     */
    const openStack: HTMLElement[] = [];
    const openedBy = new Map<HTMLElement, HTMLElement>();
    let currentTrigger: HTMLElement | null = null;

    /*
     * The lock itself is index.css, reading the state written here — no
     * scrollLocker, no bridge. The old bridge used one shared name, so
     * closing one of two open panels unlocked the page early; the CSS rule
     * holds while any of them is open.
     */
    const setActive = (el: HTMLElement, active: boolean): void => {
        const was = isActive(el);
        el.setAttribute(ACTIVE, String(active));

        if (!locksScroll(el) || was === active) return;

        if (active) {
            openStack.push(el);
            if (currentTrigger) openedBy.set(el, currentTrigger);
            el.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
        } else {
            const index = openStack.indexOf(el);
            if (index !== -1) openStack.splice(index, 1);

            // Only pull focus back if it is still inside the panel that
            // closed — if the user already moved on, leave them where they are.
            const back = openedBy.get(el);
            openedBy.delete(el);
            if (back && el.contains(document.activeElement)) back.focus({ preventScroll: true });
        }
    };

    const apply = (action: Action, name: string, except: string[] = []): void => {
        for (const el of targetsNamed(name)) {
            if (except.length && namesOf(el).some((n) => except.includes(n))) continue;
            if (action === "open") setActive(el, true);
            else if (action === "close") setActive(el, false);
            else setActive(el, !isActive(el));
        }
    };

    const run = (command: string): void => {
        const c = parse(command);
        if (!c) return;

        // The condition is checked once. The old code ran the action once
        // per matching A, so two open A's toggled B twice and cancelled out.
        if (c.when) {
            const { opened, name } = c.when;
            if (!targetsNamed(name).some((el) => isActive(el) === opened)) return;
        }
        apply(c.action, c.name, c.except);
    };

    /*
     * One listener on document, resolved at click time. The old code bound
     * each trigger once at page load, which misses anything React renders
     * later.
     */
    const fire = (trigger: HTMLElement): void => {
        // What this screen size leaves out, read once per press — so a
        // media query that changes it takes effect on the next one.
        const skip = skippedBy(trigger);
        currentTrigger = trigger;
        commandsOf(trigger)
            .filter((command) => !skip.some((entry) => skips(entry, command)))
            .forEach(run);
        currentTrigger = null;
    };

    const onClick = (event: MouseEvent): void => {
        if (live !== self) return;
        const trigger = (event.target as Element | null)?.closest<HTMLElement>(`[${TRIGGER}]`);
        if (!trigger) return;
        fire(trigger);
        syncAria();
    };

    /*
     * #id in the address: open the closed targets it is in, outermost
     * first, each through the button that opens it — so a tab closes its
     * siblings as a click would. A target no button opens simply opens.
     * Then go to it: the browser could not, while it was closed.
     */
    const openFromHash = (): void => {
        if (live !== self) return;
        let id = location.hash.slice(1);
        try {
            id = decodeURIComponent(id);
        } catch {
            // A malformed escape: look the id up as it is written.
        }
        const found = id ? document.getElementById(id) : null;
        if (!found) return;

        const closed: HTMLElement[] = [];
        for (let el = found.closest<HTMLElement>(`[${TARGET}]`); el; el = el.parentElement?.closest<HTMLElement>(`[${TARGET}]`) ?? null) {
            if (!isActive(el)) closed.unshift(el);
        }
        if (!closed.length) return;

        const triggers = Array.from(document.querySelectorAll<HTMLElement>(`[${TRIGGER}]`));
        for (const target of closed) {
            const names = namesOf(target);
            const trigger = triggers.find((t) => {
                const name = ownTarget(t);
                return name !== null && names.includes(name);
            });
            if (trigger) fire(trigger);
            else setActive(target, true);
        }
        syncAria();
        found.scrollIntoView();
    };

    /* Escape closes the dialog-like target opened last, by its first name
       so anything sharing that name (a backdrop) closes with it. */
    const onKeydown = (event: KeyboardEvent): void => {
        if (live !== self || event.key !== "Escape") return;

        const last = openStack[openStack.length - 1];
        const name = last && namesOf(last)[0];
        if (!name) return;

        event.preventDefault();
        apply("close", name);
        syncAria();
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    addEventListener("hashchange", openFromHash);
    syncAria();
    openFromHash();

    return () => {
        document.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKeydown);
        removeEventListener("hashchange", openFromHash);
        if (live === self) live = null;
    };
}
