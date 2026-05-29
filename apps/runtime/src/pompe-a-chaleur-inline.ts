import { Simulator as SimulatorSchema, type Simulator } from "@g6k4ever/schema";
import raw from "../../../_corpus/portail-elec/pompe-a-chaleur.json";

const parsed = SimulatorSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error(
    `pompe-a-chaleur.json invalide : ${JSON.stringify(parsed.error.format(), null, 2)}`,
  );
}

export const pompeAChaleurInline: Simulator = parsed.data;
