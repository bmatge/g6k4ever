/**
 * Préfixe interne utilisé pour transformer les références `#id` G6K en
 * identifiants JavaScript valides pour jsep.
 *
 * Exemple : `#42 + 1` → `__data_42 + 1`. jsep parse alors `__data_42` comme
 * un `Identifier` standard, que l'évaluateur résout en lookup dans `state.values`.
 */
export const DATA_IDENTIFIER_PREFIX = "__data_";

const HASH_REFERENCE_RE = /#(\d+)/g;

/**
 * Transforme une expression G6K (avec `#id`) en chaîne consommable par jsep.
 *
 * Ne touche PAS au reste de la syntaxe : on suppose que les expressions du schéma
 * sont déjà bornées (pas de boucle, pas de ternaire, JS standard).
 */
export function preprocessExpression(source: string): string {
  return source.replace(HASH_REFERENCE_RE, `${DATA_IDENTIFIER_PREFIX}$1`);
}

/**
 * Extrait l'id numérique d'un identifiant `__data_<n>`. Retourne `null` si
 * l'identifiant n'est pas un alias de Data.
 */
export function dataIdFromIdentifier(name: string): number | null {
  if (!name.startsWith(DATA_IDENTIFIER_PREFIX)) return null;
  const rest = name.slice(DATA_IDENTIFIER_PREFIX.length);
  const n = Number(rest);
  return Number.isInteger(n) && n > 0 ? n : null;
}
