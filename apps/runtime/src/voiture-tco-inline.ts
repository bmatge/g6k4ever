import { Simulator as SimulatorSchema, type Simulator } from "@g6k4ever/schema";
import raw from "../../../_corpus/portail-elec/voiture-tco.json";

const parsed = SimulatorSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error(
    `voiture-tco.json invalide : ${JSON.stringify(parsed.error.format(), null, 2)}`,
  );
}

export const voitureTcoInline: Simulator = parsed.data;
