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
 *
 * State lives in ONE attribute, data-pg-target-active="true|false". The old
 * code kept it twice (data-qua-status plus the qua-active class) and every
 * write had to touch both.
 *
 * Every attribute starts with data-pg-target, so nothing here can collide
 * with another package's names.
 *
 * Names are split on "-", so a target name must not contain one.
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
const TRIGGER = "data-pg-target-functions";
const TARGET = "data-pg-target";
const ACTIVE = "data-pg-target-active";
const SCROLL_LOCK = "data-pg-target-scroll-lock";
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
/* A target may carry several names: data-pg-target="aside menu". */
function namesOf(el) {
    return (el.getAttribute(TARGET) ?? "").trim().split(/\s+/).filter(Boolean);
}
function targetsNamed(name) {
    return Array.from(document.querySelectorAll(`[${TARGET}]`)).filter((el) => namesOf(el).includes(name));
}
function isActive(el) {
    return el.getAttribute(ACTIVE) === "true";
}
function locksScroll(el) {
    return el.getAttribute(SCROLL_LOCK) === "true";
}
function isAction(value) {
    return value === "open" || value === "close" || value === "toggle";
}
function commandsOf(trigger) {
    return (trigger.getAttribute(TRIGGER) ?? "").trim().split(/\s+/).filter(Boolean);
}
/*
 * aria-expanded tells a screen reader whether the thing a button controls
 * is open. Only set on disclosure buttons — a single toggle-X or open-X.
 * A close button, a chain or a conditional has no single "expanded" state,
 * so those are left untouched.
 */
function syncAria() {
    document.querySelectorAll(`[${TRIGGER}]`).forEach((trigger) => {
        const commands = commandsOf(trigger);
        if (commands.length !== 1)
            return;
        const [action, name, extra] = commands[0].split("-");
        if ((action !== "toggle" && action !== "open") || !name || extra)
            return;
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
let live = null;
/* Start listening; returns the cleanup for a React effect. */
export function initTargetFunctions() {
    if (typeof document === "undefined")
        return () => { };
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
    const openStack = [];
    const openedBy = new Map();
    let currentTrigger = null;
    /*
     * The lock itself is index.css, reading the state written here — no
     * scrollLocker, no bridge. The old bridge used one shared name, so
     * closing one of two open panels unlocked the page early; the CSS rule
     * holds while any of them is open.
     */
    const setActive = (el, active) => {
        const was = isActive(el);
        el.setAttribute(ACTIVE, String(active));
        if (!locksScroll(el) || was === active)
            return;
        if (active) {
            openStack.push(el);
            if (currentTrigger)
                openedBy.set(el, currentTrigger);
            el.querySelector(FOCUSABLE)?.focus({ preventScroll: true });
        }
        else {
            const index = openStack.indexOf(el);
            if (index !== -1)
                openStack.splice(index, 1);
            // Only pull focus back if it is still inside the panel that
            // closed — if the user already moved on, leave them where they are.
            const back = openedBy.get(el);
            openedBy.delete(el);
            if (back && el.contains(document.activeElement))
                back.focus({ preventScroll: true });
        }
    };
    const apply = (action, name) => {
        for (const el of targetsNamed(name)) {
            if (action === "open")
                setActive(el, true);
            else if (action === "close")
                setActive(el, false);
            else
                setActive(el, !isActive(el));
        }
    };
    const run = (command) => {
        const parts = command.split("-");
        // open-X · close-X · toggle-X
        if (parts.length === 2 && isAction(parts[0])) {
            apply(parts[0], parts[1]);
            return;
        }
        // if-opened-A-action-B · if-closed-A-action-B
        //
        // The condition is checked once. The old code ran the action once
        // per matching A, so two open A's toggled B twice and cancelled out.
        if (parts.length === 5 && parts[0] === "if" && isAction(parts[3])) {
            const wanted = parts[1] === "opened" ? true : parts[1] === "closed" ? false : null;
            if (wanted === null)
                return;
            if (targetsNamed(parts[2]).some((el) => isActive(el) === wanted)) {
                apply(parts[3], parts[4]);
            }
        }
    };
    /*
     * One listener on document, resolved at click time. The old code bound
     * each trigger once at page load, which misses anything React renders
     * later.
     */
    const onClick = (event) => {
        if (live !== self)
            return;
        const trigger = event.target?.closest(`[${TRIGGER}]`);
        if (!trigger)
            return;
        currentTrigger = trigger;
        commandsOf(trigger).forEach(run);
        currentTrigger = null;
        syncAria();
    };
    /* Escape closes the dialog-like target opened last, by its first name
       so anything sharing that name (a backdrop) closes with it. */
    const onKeydown = (event) => {
        if (live !== self || event.key !== "Escape")
            return;
        const last = openStack[openStack.length - 1];
        const name = last && namesOf(last)[0];
        if (!name)
            return;
        event.preventDefault();
        apply("close", name);
        syncAria();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
    syncAria();
    return () => {
        document.removeEventListener("click", onClick);
        document.removeEventListener("keydown", onKeydown);
        if (live === self)
            live = null;
    };
}
