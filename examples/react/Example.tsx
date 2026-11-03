"use client";

import { useEffect } from "react";
import { initTargetFunctions } from "@plusguard/target-functions";

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
                data-pg-active="false"
                data-pg-target-functions="close-menu"
                className="backdrop"
            />
            <aside data-pg-target="menu" data-pg-active="false" data-pg-scroll-lock="true">
                <button data-pg-target-functions="close-menu">Close</button>
                <nav>…</nav>
            </aside>
        </>
    );
}
