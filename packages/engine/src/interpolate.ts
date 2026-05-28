/**
 * Interpole une chaîne de message ou de contenu en remplaçant `#<id>` par la
 * valeur courante de la Data correspondante.
 *
 * Si la valeur est `undefined`/`null`, on remplace par chaîne vide.
 * Utilisé pour :
 *   - les `message` des actions `notifyError`/`notifyWarning`
 *   - le contenu textuel des blocs (préparé côté blocks-dev, hors moteur)
 */
const HASH_RE = /#(\d+)/g;

export function interpolate(text: string, values: Map<number, unknown>): string {
  return text.replace(HASH_RE, (_match, idStr: string) => {
    const id = Number(idStr);
    const v = values.get(id);
    if (v === undefined || v === null) return "";
    return String(v);
  });
}
