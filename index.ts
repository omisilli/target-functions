/*
 * targetFunctions — open, close and toggle elements by name, from markup.
 *
 *   <button data-pg-target-functions="open-menu if-opened-menu-close-search">
 *   <aside  data-pg-target="menu"   data-pg-active="false" data-pg-scroll-lock="true">
 *   <div    data-pg-target="search" data-pg-active="false">
 *
 * Commands, space separated, run left to right against live state:
 *   open-X · close-X · toggle-X
 *   if-opened-A-<open|close|toggle>-B
 *   if-closed-A-<open|close|toggle>-B
 *
 * State lives in ONE attribute, data-pg-active="true|false". The old code
 * kept it twice (data-qua-status plus the qua-active class) and every write
 * had to touch both.
 *
 * Names are split on "-", so a target name must not contain one.
 *
 * No dependencies. Scroll locking is optional and supplied by the caller:
 *   initTargetFunctions({ lock, unlock })
 * Without it, data-pg-scroll-lock targets simply open without locking.
 *
 * React: JSX sets the starting value (data-pg-active="false") and must not
 * change it afterwards — from then on this file owns it. If a re-render
 * writes a different value, React wins and the state is lost.
 */

export type TargetFunctionsOptions = {
    /** Called when a data-pg-scroll-lock target opens. `source` is unique per target. */
    lock?: (source: string) => void;
    /** Called when that target closes, with the same `source`. */
    unlock?: (source: string) => void;
};

type Action = "open" | "close" | "toggle";

const TRIGGER = "data-pg-target-functions";
const TARGET = "data-pg-target";
const ACTIVE = "data-pg-active";
/* On a target: "lock the page while I am open". PlusGuard's own locker
   writes the same name on <html> to mean "the page is locked now"; its CSS
   only matches html[data-pg-scroll-lock], so the two never collide. */
const SCROLL_LOCK = "data-pg-scroll-lock";

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/*
 * Accessibility state.
 *
 * A target that locks scroll behaves like a dialog — drawer, overlay,
 * dropdown — so it gets the dialog treatment: focus moves in when it opens,
 * goes back to the button that opened it when it closes, and Escape closes
 * the one opened last. Targets that do not lock scroll (accordions, tabs)
 * are left alone; Escape closing a tab panel would be wrong.
 */
const openStack: HTMLElement[] = [];
const openedBy = new Map<HTMLElement, HTMLElement>();
let currentTrigger: HTMLElement | null = null;
let lock: TargetFunctionsOptions["lock"];
let unlock: TargetFunctionsOptions["unlock"];

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

/*
 * Replaces the old scrollBridge.js. That file watched data-qua-status with
 * a MutationObserver because the scripts were separate globals; here we are
 * the ones changing the state, so we call the lock callbacks directly.
 *
 * Each target locks under its own name. The old bridge used one shared
 * name, so closing one of two open panels unlocked the page early.
 */
function setActive(el: HTMLElement, active: boolean): void {
    const was = isActive(el);
    el.setAttribute(ACTIVE, String(active));

    if (!locksScroll(el) || was === active) return;

    const source = `targetFunctions:${el.getAttribute(TARGET)}`;

    if (active) {
        lock?.(source);
        openStack.push(el);
        if (currentTrigger) openedBy.set(el, currentTrigger);
        el.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    } else {
        unlock?.(source);
        openStack.splice(openStack.indexOf(el), 1);

        // Only pull focus back if it is still inside the panel that closed —
        // if the user already moved on, leave them where they are.
        const back = openedBy.get(el);
        openedBy.delete(el);
        if (back && el.contains(document.activeElement)) back.focus({ preventScroll: true });
    }
}

function apply(action: Action, name: string): void {
    for (const el of targetsNamed(name)) {
        if (action === "open") setActive(el, true);
        else if (action === "close") setActive(el, false);
        else setActive(el, !isActive(el));
    }
}

function isAction(value: string | undefined): value is Action {
    return value === "open" || value === "close" || value === "toggle";
}

function commandsOf(trigger: HTMLElement): string[] {
    return (trigger.getAttribute(TRIGGER) ?? "").trim().split(/\s+/).filter(Boolean);
}

function run(command: string): void {
    const parts = command.split("-");

    // open-X · close-X · toggle-X
    if (parts.length === 2 && isAction(parts[0])) {
        apply(parts[0], parts[1]);
        return;
    }

    // if-opened-A-action-B · if-closed-A-action-B
    //
    // The condition is checked once. The old code ran the action once per
    // matching A, so two open A's toggled B twice and cancelled out.
    if (parts.length === 5 && parts[0] === "if" && isAction(parts[3])) {
        const wanted = parts[1] === "opened" ? true : parts[1] === "closed" ? false : null;
        if (wanted === null) return;

        if (targetsNamed(parts[2]).some((el) => isActive(el) === wanted)) {
            apply(parts[3], parts[4]);
        }
    }
}

/*
 * aria-expanded tells a screen reader whether the thing a button controls
 * is open. Only set on disclosure buttons — a single toggle-X or open-X.
 * A close button, a chain or a conditional has no single "expanded" state,
 * so those are left untouched.
 */
function syncAria(): void {
    document.querySelectorAll<HTMLElement>(`[${TRIGGER}]`).forEach((trigger) => {
        const commands = commandsOf(trigger);
        if (commands.length !== 1) return;

        const [action, name, extra] = commands[0].split("-");
        if ((action !== "toggle" && action !== "open") || !name || extra) return;

        const open = targetsNamed(name).some(isActive);
        trigger.setAttribute("aria-expanded", String(open));
    });
}

/*
 * One listener on document, resolved at click time. The old code bound each
 * trigger once at page load, which misses anything React renders later.
 */
function onClick(event: MouseEvent): void {
    const trigger = (event.target as Element | null)?.closest<HTMLElement>(`[${TRIGGER}]`);
    if (!trigger) return;

    currentTrigger = trigger;
    commandsOf(trigger).forEach(run);
    currentTrigger = null;

    syncAria();
}

/* Escape closes the dialog-like target opened last, by its first name so
   anything sharing that name (a backdrop) closes with it. */
function onKeydown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;

    const last = openStack[openStack.length - 1];
    const name = last && namesOf(last)[0];
    if (!name) return;

    event.preventDefault();
    apply("close", name);
    syncAria();
}

/* Start listening; returns the cleanup for a React effect. */
export function initTargetFunctions(options: TargetFunctionsOptions = {}): () => void {
    if (typeof document === "undefined") return () => {};

    lock = options.lock;
    unlock = options.unlock;

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    syncAria();

    return () => {
        document.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKeydown);
        lock = undefined;
        unlock = undefined;
    };
}
