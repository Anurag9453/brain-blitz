// All GK categories. Each folder owns its own parts list.
import type { GkData } from "../types";
import { PARTS as history } from "./history";
import { PARTS as geography } from "./geography";
import { PARTS as polity } from "./polity";
import { PARTS as scitech } from "./scitech";
import { PARTS as world } from "./world";
import { PARTS as culture } from "./culture";
import { PARTS as economy } from "./economy";
import { PARTS as sports } from "./sports";

export const GK_DATA: GkData[] = [...history, ...geography, ...polity, ...scitech, ...world, ...culture, ...economy, ...sports];
