// General Knowledge (India-focused): data + generators.
import { buildGkGens } from "./build";
import { GK_DATA } from "./data";

export const GK: ReturnType<typeof buildGkGens> = buildGkGens(GK_DATA);
export { GK_DATA };
export { GK_LABEL } from "./build";
export type * from "./types";
