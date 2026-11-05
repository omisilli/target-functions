"use client";

import { useEffect } from "react";
import { initTargetFunctions } from "@plusguard/target-functions";
import "@plusguard/target-functions/index.css";

/* Mount once, high in the tree. */
export function TargetFunctions() {
    useEffect(() => initTargetFunctions(), []);
    return null;
}

/* A drawer with a backdrop — both share the name "menu". */
export function Example() {
    return (
        <>
            <TargetFunctions />

            <button data-pg-target-functions="toggle-menu">Menu</button>

            <div
                data-pg-target="menu"
                data-pg-target-active="false"
                data-pg-target-functions="close-menu"
                className="backdrop"
            />
            <aside
                data-pg-target="menu"
                data-pg-target-active="false"
                data-pg-target-scroll-lock="true"
            >
                <button data-pg-target-functions="close-menu">Close</button>
                <nav>…</nav>
            </aside>
        </>
    );
}

/*
 * An accordion: each question closes every answer but its own, then flips
 * its own — "close-faq-except-s1 toggle-s1". On a phone, any number stay
 * open: the CSS leaves the close out there.
 *
 *   @media (width < 48rem) {
 *       .faq { --pg-target-skip: close-faq; }
 *   }
 *
 * The opening is CSS, nothing measured: the body is a one-row grid that
 * grows from 0fr to 1fr; the inner div is what the browser sizes.
 *
 *   .faq-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.5s ease; }
 *   .faq-body > div { overflow: hidden; }
 *   .faq-body[data-pg-target-active="true"] { grid-template-rows: 1fr; }
 */
const questions = [
    { id: "s1", q: "What is a target?", a: "Any element with data-pg-target." },
    { id: "s2", q: "Can two targets share a name?", a: "Yes — every one of them is reached." },
    { id: "s3", q: "What does except do?", a: "It leaves names out of a command." },
];

export function Accordion() {
    return (
        <div className="faq">
            {questions.map(({ id, q, a }) => (
                <div key={id}>
                    {/* JSX sets the starting state; targetFunctions owns it after. */}
                    <button data-pg-target-functions={`close-faq-except-${id} toggle-${id}`} aria-controls={id}>
                        {q}
                    </button>
                    <div className="faq-body" id={id} data-pg-target={`${id} faq`} data-pg-target-active="false">
                        <div>
                            <p>{a}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* Except, beyond accordions: three chips, each its own name and all of
   them "chip". */
export function Chips() {
    return (
        <>
            {["a", "b", "c"].map((n) => (
                <span key={n} data-pg-target={`${n} chip`} data-pg-target-active="false">
                    {n.toUpperCase()}
                </span>
            ))}
            <button data-pg-target-functions="toggle-chip">Flip all</button>
            <button data-pg-target-functions="toggle-chip-except-a">Flip all but A</button>
            <button data-pg-target-functions="open-chip-except-b-c">Open A only</button>
            <button data-pg-target-functions="close-chip">Close all</button>
        </>
    );
}

/*
 * A site's footer: five open columns on a computer, an accordion below
 * 62rem — one at a time, any number on the narrowest phones. The CSS:
 *
 *   .sf-body { display: grid; grid-template-rows: 1fr; }
 *   .sf-body > div { overflow: hidden; }
 *   .sf-head svg { display: none; transition: rotate 0.5s ease; }
 *   .sf-head[aria-expanded="true"] svg { rotate: 90deg; }
 *   @media (width >= 62rem) { .sf-head { pointer-events: none; } }   titles, not buttons
 *   @media (width < 62rem) {
 *       .sf-head svg { display: block; }
 *       .sf-body { grid-template-rows: 0fr; transition: grid-template-rows 0.5s ease; }
 *       .sf-body[data-pg-target-active="true"] { grid-template-rows: 1fr; }
 *   }
 *   @media (width <= 350px) { .site-foot { --pg-target-skip: close-foot; } }
 */
const columns = [
    { id: "f1", title: "Corporate", links: ["About us", "Mission", "Vision", "Contact"] },
    { id: "f2", title: "Products", links: ["All products", "White goods", "Built-in", "Kitchenware"] },
    { id: "f3", title: "Orders", links: ["Delivery terms", "Sales agreement", "Payment options", "Returns"] },
    { id: "f4", title: "FAQ", links: ["General", "Orders", "Shipping", "Payment"] },
    { id: "f5", title: "Contact", links: ["Head office", "Factory", "Purchasing", "Human resources"] },
];

export function SiteFooter() {
    return (
        <footer className="site-foot">
            <div className="sf-cols">
                {columns.map(({ id, title, links }) => (
                    <div key={id}>
                        <h3>
                            <button
                                className="sf-head"
                                data-pg-target-functions={`close-foot-except-${id} toggle-${id}`}
                                aria-controls={id}
                            >
                                {title}
                                <svg viewBox="0 0 16 16" aria-hidden="true">
                                    <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            </button>
                        </h3>
                        <div className="sf-body" id={id} data-pg-target={`${id} foot`} data-pg-target-active="false">
                            <div>
                                <ul>
                                    {links.map((l) => (
                                        <li key={l}>
                                            <a href="#">{l}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </footer>
    );
}
