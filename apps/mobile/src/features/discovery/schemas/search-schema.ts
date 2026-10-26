import { z } from "zod";
import { ListClubsParams } from "../../../../.generated/schemas/index.zod";

/** Shares the contract's Unicode limit while keeping a definite editable string in RHF. */
export const searchSchema = ListClubsParams.pick({ q: true }).required();
/** Search text is editing state; pagination and resource tabs have separate owners. */
export type SearchValues = z.infer<typeof searchSchema>;
