import { Simulator as SimulatorSchema, type Simulator } from "@g6k4ever/schema";
import raw from "../../../_corpus/g6k/gratification-stagiaire.json";

const parsed = SimulatorSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error(
    `gratification-stagiaire.json invalide : ${JSON.stringify(parsed.error.format(), null, 2)}`,
  );
}

export const gratificationStagiaireInline: Simulator = parsed.data;
