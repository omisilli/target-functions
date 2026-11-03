export type TargetFunctionsOptions = {
    /** Called when a data-pg-target-scroll-lock target opens. `source` is unique per target. */
    lock?: (source: string) => void;
    /** Called when that target closes, with the same `source`. */
    unlock?: (source: string) => void;
};
export declare function initTargetFunctions(options?: TargetFunctionsOptions): () => void;
