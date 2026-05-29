// Génère _corpus/portail-elec/fact-checker.json depuis la spec du fact-checker
// du portail-elec (5 familles × 17 sujets). Source de vérité = constante
// CATEGORIES extraite manuellement du HTML legacy
// `simulateurs-portail-elec/fact-checker/index.html`.
//
// Modèle g6k4ever utilisé :
//   - 2 Data choice : `famille` (1) + `sujet` (2)
//   - Étape 1 : sélectionner famille + sujet (sujet filtré par règle)
//   - Étape 2 : afficher la fiche réponse du sujet sélectionné
//   - 1 chapter "sujet" + 17 chapters de réponse, conditionnés par règles
//
// Lancer : `node tools/build-fact-checker.mjs`
// Output : `_corpus/portail-elec/fact-checker.json`

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "_corpus/portail-elec/fact-checker.json");

// ============================================================================
// Données extraites du HTML legacy.
// ============================================================================

const CATEGORIES = [
  {
    id: "financial",
    label: "Coût et financement",
    subs: [
      {
        id: "purchase_price",
        label: "Le prix d'achat me paraît trop élevé",
        response: {
          title: "Le coût d'achat après aides publiques",
          stats: [
            { value: "5 000 €", label: "Bonus écologique maximal en 2024 (sous conditions de revenus).", source: "Décret n° 2023-1214" },
            { value: "1 000 €", label: "Prime à la conversion en cas de mise au rebut d'un véhicule thermique ancien.", source: "Service-public.fr 2024" },
            { value: "7 000 €", label: "Bonus écologique majoré pour les ménages dont le revenu fiscal de référence est inférieur à 15 400 €.", source: "Décret n° 2023-1214" },
            { value: "≈ 23 000 €", label: "Prix moyen d'un véhicule électrique neuf de segment B après bonus (exemple : Renault 5 E-Tech).", source: "AAA Data 2024" },
          ],
          insight: "Plutôt que de comparer uniquement le prix d'achat, le coût total de possession (TCO) sur 5 ans intègre le carburant, l'entretien, l'assurance et la décote. Selon l'ADEME, l'électricité revient en moyenne à un tiers du coût de l'essence au kilomètre, et l'entretien d'un véhicule électrique est environ 40 % moins coûteux (pas de vidange, d'embrayage ni de distribution).",
          tip: "Pour un comparatif sur votre situation précise, utilisez le simulateur « Achat d'une voiture électrique » du portail.",
        },
      },
      {
        id: "resale",
        label: "Je doute de la valeur de revente",
        response: {
          title: "La valeur de revente des véhicules électriques",
          stats: [
            { value: "−20 %", label: "Décote moyenne d'un véhicule électrique de 3 ans par rapport au neuf (−35 % pour un thermique équivalent).", source: "Argus / Autobiz 2024" },
            { value: "+28 %", label: "Hausse des prix de l'occasion électrique observée entre 2021 et 2023.", source: "AAA Data 2023" },
            { value: "8 ans / 160 000 km", label: "Garantie constructeur réglementaire minimale sur la batterie en Europe.", source: "Règlement UE 2023" },
          ],
          insight: "La valeur résiduelle s'améliore avec la maturation du marché de l'occasion. La garantie batterie obligatoire de 8 ans constitue un repère stable pour les acheteurs en seconde main, ce qui contribue à soutenir les prix.",
          tip: "Un véhicule électrique d'occasion encore sous garantie batterie peut représenter un compromis pertinent entre prix d'achat et risque technique.",
        },
      },
      {
        id: "charging_install",
        label: "L'installation d'une borne à domicile me semble coûteuse",
        response: {
          title: "Coût d'installation et aides disponibles",
          stats: [
            { value: "500 €", label: "Aide ADVENIR pour l'installation d'un point de recharge en maison individuelle.", source: "ADVENIR / AFIREV 2024" },
            { value: "75 %", label: "Part des recharges effectuées à domicile ou sur le lieu de travail.", source: "ADEME 2023" },
            { value: "800 à 1 500 €", label: "Plage de coût d'installation d'une borne murale (matériel + pose).", source: "FFIE 2024" },
            { value: "75 % / 300 €", label: "Crédit d'impôt pour la mise en place d'un système de charge à domicile, plafonné à 300 € par équipement.", source: "CGI art. 200 quater C" },
          ],
          insight: "Le cumul de l'aide ADVENIR et du crédit d'impôt couvre une part importante du coût pour une maison individuelle. En copropriété, la loi LOM (2019) garantit à chaque résident un « droit à la prise » : la copropriété ne peut pas s'opposer à l'installation d'une borne individuelle dans un parking privatif.",
          tip: "Pour un projet en copropriété, faire la demande au syndic par lettre recommandée — le délai de réponse est encadré (3 mois).",
        },
      },
      {
        id: "battery_cost",
        label: "Je redoute le coût d'un remplacement de batterie",
        response: {
          title: "Durée de vie réelle des batteries",
          stats: [
            { value: "90 %", label: "Capacité résiduelle moyenne d'une batterie après 8 ans d'usage, selon les études terrain.", source: "Recurrent Auto 2023" },
            { value: "< 2 %", label: "Taux de remplacement de batterie observé sous garantie constructeur.", source: "ADAC 2024" },
            { value: "8 ans / 160 000 km", label: "Garantie batterie réglementaire minimale en Europe.", source: "Règlement UE 2023" },
            { value: "−89 %", label: "Baisse du coût des batteries lithium-ion entre 2010 et 2023.", source: "BloombergNEF 2023" },
          ],
          insight: "Les retours d'expérience disponibles depuis l'arrivée des premiers véhicules électriques grand public montrent une dégradation lente et progressive — pas d'effondrement brutal. Sous garantie, les remplacements complets restent très rares, et le coût d'un module unitaire (en cas de défaut localisé) est sensiblement inférieur à celui d'un remplacement total.",
          tip: "Pour l'achat d'occasion, demander un rapport d'état de santé de la batterie (SOH) : la plupart des constructeurs et garages le fournissent gratuitement.",
        },
      },
    ],
  },
  {
    id: "usage",
    label: "Autonomie et recharge",
    subs: [
      {
        id: "range_anxiety",
        label: "L'autonomie me paraît insuffisante",
        response: {
          title: "Autonomie réelle face aux trajets quotidiens",
          stats: [
            { value: "30 km", label: "Distance médiane domicile-travail en France.", source: "INSEE 2023" },
            { value: "350 à 600 km", label: "Autonomie WLTP des véhicules électriques commercialisés en France en 2024.", source: "AVERE 2024" },
            { value: "95 %", label: "Part des trajets en France réalisables sans recharge intermédiaire avec un véhicule électrique récent.", source: "ADEME 2023" },
            { value: "41 km", label: "Distance moyenne parcourue en voiture par jour et par personne en France.", source: "ENTD / ADEME" },
          ],
          insight: "L'autonomie est l'interrogation la plus fréquemment citée dans les enquêtes d'opinion. Les données d'usage montrent toutefois que la grande majorité des trajets du quotidien tiennent dans une seule charge hebdomadaire pour la plupart des conducteurs. Le ressenti d'anxiété diminue rapidement après quelques semaines d'usage.",
          tip: "Avant l'achat, regarder son kilométrage annuel réel sur la carte grise et la décomposition entre trajets quotidiens et longs trajets — l'écart avec les besoins théoriques est souvent important.",
        },
      },
      {
        id: "charge_time",
        label: "Le temps de recharge me paraît trop long",
        response: {
          title: "Temps de recharge selon les usages",
          stats: [
            { value: "≈ 8 h", label: "Recharge complète sur prise renforcée domestique 7 kW.", source: "IEC 61851" },
            { value: "≈ 30 min", label: "Recharge de 20 à 80 % sur borne rapide DC 50–150 kW.", source: "Constructeurs 2024" },
            { value: "+150 %", label: "Croissance du réseau de bornes rapides en France entre 2021 et 2024.", source: "AFIREV 2024" },
          ],
          insight: "Le modèle d'usage diffère du plein d'essence : la majorité des conducteurs rechargent à domicile la nuit et démarrent le matin avec une batterie pleine. La borne rapide n'intervient que pour les longs trajets, et une pause de 25 à 30 minutes y suffit pour ajouter 200 à 300 km d'autonomie.",
          tip: "Sur autoroute, planifier la recharge sur des aires équipées de bornes ≥ 150 kW — le gain de temps par rapport aux bornes ≤ 50 kW est significatif.",
        },
      },
      {
        id: "charging_network",
        label: "Le réseau de bornes publiques me semble insuffisant",
        response: {
          title: "État actuel du réseau de bornes en France",
          stats: [
            { value: "≈ 130 000", label: "Points de charge publics ouverts en France fin 2024.", source: "AFIREV / GIREVE 2024" },
            { value: "100 %", label: "Aires de service autoroutières équipées en bornes de recharge rapide.", source: "ASFA 2024" },
            { value: "×3", label: "Multiplication du nombre de points de charge publics en France entre 2021 et 2024.", source: "AFIREV 2024" },
          ],
          insight: "La couverture autoroutière nationale est désormais complète et les zones urbaines denses sont bien équipées. Les zones rurales restent un point de vigilance, mais le rythme de déploiement reste soutenu, notamment grâce au cofinancement de l'État et des collectivités.",
          tip: "Avant un long trajet, repérer les bornes sur le parcours via Chargemap ou A Better Route Planner (ABRP) — ces applications intègrent les statuts de fonctionnement en temps réel.",
        },
      },
      {
        id: "reliability",
        label: "Je crains que les bornes soient souvent en panne",
        response: {
          title: "Fiabilité du réseau de recharge",
          stats: [
            { value: "78 %", label: "Taux de disponibilité moyen des bornes publiques en France en 2023.", source: "AFIREV 2023" },
            { value: "91 %", label: "Taux de disponibilité des bornes rapides sur autoroute.", source: "AFIREV 2023" },
            { value: "99 %", label: "Objectif réglementaire de disponibilité fixé par le règlement européen AFIR à horizon 2030.", source: "Règlement UE AFIR" },
          ],
          insight: "La fiabilité s'améliore progressivement, sous l'effet conjoint de la réglementation européenne (AFIR, 2023) et de la concurrence entre opérateurs. Les réseaux des opérateurs principaux (Tesla Supercharger, IONITY, Fastned, Electra) atteignent déjà des taux de disponibilité supérieurs à 97 %.",
          tip: "Pour les longs trajets, privilégier les opérateurs reconnus pour leur fiabilité et la qualité de leur supervision en temps réel.",
        },
      },
    ],
  },
  {
    id: "confidence",
    label: "Confiance et habitudes",
    subs: [
      {
        id: "fear_stranded",
        label: "Je crains de tomber en panne d'énergie",
        response: {
          title: "Le risque de panne d'énergie en pratique",
          stats: [
            { value: "0,04 %", label: "Part des interventions de dépannage pour panne d'énergie sur véhicules électriques (vs 0,6 % pour les thermiques).", source: "RAC Foundation 2023" },
            { value: "2 alertes", label: "Niveaux d'alerte successifs sur la plupart des véhicules électriques (20 % puis 10 % de batterie).", source: "ADAC 2023" },
          ],
          insight: "Les systèmes de navigation embarqués anticipent l'autonomie restante en fonction du parcours, du relief et de la météo, et proposent automatiquement les bornes adaptées. Le risque réel de panne d'énergie est sensiblement plus faible qu'avec un véhicule thermique, à condition d'utiliser la navigation connectée pour les longs trajets.",
          tip: "Activer la navigation connectée fournie par le constructeur : elle recalcule l'autonomie en temps réel et adapte la vitesse de croisière si nécessaire.",
        },
      },
      {
        id: "technology_anxiety",
        label: "La technologie me paraît complexe",
        response: {
          title: "Complexité mécanique comparée",
          stats: [
            { value: "≈ 20", label: "Nombre de pièces mobiles dans un moteur électrique (contre ≈ 2 000 dans un moteur thermique avec sa transmission).", source: "IEA 2023" },
            { value: "4,5/5", label: "Note de satisfaction moyenne des propriétaires de véhicules électriques en France.", source: "UFC-Que Choisir 2023" },
            { value: "≈ 90 %", label: "Part des propriétaires de véhicule électrique déclarant ne pas vouloir revenir au thermique.", source: "Kantar 2023" },
          ],
          insight: "La motorisation électrique est mécaniquement plus simple : pas de boîte de vitesses à plusieurs rapports, pas de distribution, pas de système d'échappement complexe. L'interface change avec le mode de conduite « une pédale » (frein régénératif), mais l'expérience est généralement décrite comme plus simple après quelques jours d'usage.",
          tip: "Un essai d'au moins 48 h, idéalement sur un week-end mêlant trajets quotidiens et un déplacement plus long, permet de se forger un avis concret.",
        },
      },
      {
        id: "habit_change",
        label: "Je ne souhaite pas modifier mes habitudes",
        response: {
          title: "Ce qui change dans l'usage quotidien",
          stats: [
            { value: "≈ 5 min", label: "Temps moyen quotidien consacré à la gestion de la recharge (brancher/débrancher).", source: "Études usagers ADEME 2023" },
            { value: "≈ 2 semaines", label: "Durée d'adaptation moyenne déclarée par les nouveaux propriétaires.", source: "AVERE 2023" },
          ],
          insight: "Le principal changement d'habitude consiste à brancher le véhicule en rentrant chez soi (ou au travail), comme on branche un téléphone. La conduite, l'entretien et les démarches administratives restent identiques à un véhicule thermique. Le passage à la recharge planifiée plutôt qu'au plein réactif modifie la temporalité, sans nécessairement la complexifier.",
          tip: "La location longue durée (1 à 3 mois) peut être un format intermédiaire pour tester l'usage avant un achat ferme.",
        },
      },
    ],
  },
  {
    id: "territorial",
    label: "Logement et géographie",
    subs: [
      {
        id: "apartment",
        label: "Je suis locataire ou en appartement sans borne",
        response: {
          title: "Droits des locataires et copropriétaires",
          stats: [
            { value: "Loi LOM 2019", label: "Droit à la prise : toute copropriété doit permettre l'installation d'une borne individuelle en parking privatif.", source: "Loi d'Orientation des Mobilités" },
            { value: "3 mois", label: "Délai maximum imposé à la copropriété pour se prononcer après demande formelle.", source: "Code de la construction et de l'habitation" },
            { value: "≈ 75 %", label: "Part des Français ayant accès à au moins une borne publique à moins de 1 km de leur domicile en 2024.", source: "AFIREV 2024" },
          ],
          insight: "La loi LOM (2019) a clarifié le cadre du droit à la prise pour les copropriétés : un refus motivé par une raison non technique est désormais contestable juridiquement. Pour les locataires sans accès à une borne privée, les recharges au travail, sur les parkings publics et les centres commerciaux couvrent une part importante des besoins.",
          tip: "Faire la demande au syndic par lettre recommandée avec accusé de réception, en mentionnant l'article L. 111-3-8 du Code de la construction.",
        },
      },
      {
        id: "rural",
        label: "Je vis en zone rurale, les bornes me semblent rares",
        response: {
          title: "Véhicule électrique en zone rurale",
          stats: [
            { value: "+45 %", label: "Croissance du nombre de bornes en zones rurales entre 2022 et 2024.", source: "AFIREV 2024" },
            { value: "≈ 85 %", label: "Part des ménages ruraux résidant en maison individuelle, condition favorable à la recharge à domicile.", source: "INSEE 2023" },
            { value: "≈ 4 €", label: "Coût d'une recharge complète de 60 kWh à domicile en heures creuses (0,17 €/kWh).", source: "EDF 2024" },
          ],
          insight: "En milieu rural, la recharge à domicile en heures creuses constitue souvent le scénario le plus économique, du fait de la prévalence des maisons individuelles. La dépendance au réseau public reste secondaire pour la majorité des usages. Les grands rouleurs (> 30 000 km / an) constituent un cas particulier à étudier au cas par cas.",
          tip: "Vérifier auprès de son fournisseur l'option heures creuses : la recharge nocturne y est environ 30 % moins chère qu'en tarif de base.",
        },
      },
      {
        id: "long_distance",
        label: "Je fais régulièrement de longs trajets",
        response: {
          title: "Longs trajets en véhicule électrique",
          stats: [
            { value: "25 à 30 min", label: "Durée moyenne d'une recharge 20–80 % sur borne rapide haute puissance (≥ 150 kW).", source: "Constructeurs 2024" },
            { value: "100 %", label: "Aires d'autoroute françaises équipées en recharge rapide fin 2024.", source: "ASFA 2024" },
            { value: "≈ 1", label: "Pause de recharge nécessaire en moyenne sur un trajet d'environ 450 km avec un véhicule récent.", source: "Tests Argus 2024" },
          ],
          insight: "Pour les longs trajets ponctuels (vacances, déplacements professionnels occasionnels), le maillage autoroutier permet une expérience comparable au thermique, avec une pause supplémentaire qui peut coïncider avec une pause repas. Pour un usage très intensif (plusieurs longs trajets hebdomadaires), un véhicule à grande autonomie ou un hybride rechargeable mérite étude.",
          tip: "Avant un long trajet, simuler le parcours avec une application dédiée (ABRP, Chargemap) — cela permet d'estimer précisément la durée et les coûts de recharge.",
        },
      },
    ],
  },
  {
    id: "environment",
    label: "Environnement et choix de société",
    subs: [
      {
        id: "carbon_footprint",
        label: "Je doute du bilan environnemental réel",
        response: {
          title: "Bilan carbone du véhicule électrique en France",
          stats: [
            { value: "−70 %", label: "Réduction des émissions de CO₂ sur le cycle de vie complet en France par rapport à un véhicule thermique équivalent.", source: "ADEME ACV 2022" },
            { value: "2 à 3 ans", label: "Durée moyenne nécessaire pour que le bilan carbone d'un véhicule électrique devienne favorable par rapport au thermique (en France).", source: "ADEME 2022" },
            { value: "−50 %", label: "Réduction des émissions à l'échelle du mix électrique européen moyen (plus carboné que le mix français).", source: "Transport & Environment 2021" },
            { value: "22 gCO₂/kWh", label: "Intensité carbone moyenne de l'électricité française (vs 400 g/kWh environ pour l'Allemagne).", source: "RTE 2023" },
          ],
          insight: "L'analyse de cycle de vie (ACV) de l'ADEME prend en compte la fabrication de la batterie, son usage et sa fin de vie. En France, l'intensité carbone du mix électrique (faible grâce au nucléaire et aux renouvelables) rend le bilan particulièrement favorable. Le surcoût carbone initial lié à la production de la batterie est compensé après 2 à 3 ans d'usage moyen.",
          tip: "Le bilan dépend du pays d'utilisation : il est particulièrement favorable en France, en Suède et en Norvège (mix électrique peu carboné).",
        },
      },
      {
        id: "lithium_mining",
        label: "L'impact de l'extraction du lithium me préoccupe",
        response: {
          title: "Lithium et ressources minières",
          stats: [
            { value: "≈ 8 kg", label: "Quantité de lithium dans une batterie de véhicule électrique de segment B.", source: "Constructeurs 2024" },
            { value: "95 %", label: "Taux minimal de recyclage des batteries imposé par la réglementation européenne à horizon 2031.", source: "Règlement UE Batteries 2023" },
            { value: "0 %", label: "Part de cobalt dans les nouvelles batteries LFP (lithium-fer-phosphate), de plus en plus répandues.", source: "IEA 2023" },
          ],
          insight: "L'extraction minière reste un sujet réel, qui fait l'objet d'efforts d'encadrement (réglementation européenne, audits, traçabilité). Les chimies récentes (LFP, sodium-ion) réduisent ou éliminent les métaux critiques comme le cobalt. À mettre en perspective avec l'impact cumulé de l'extraction et du raffinage du pétrole sur la durée de vie d'un véhicule thermique.",
          tip: "Si l'origine des matériaux est un critère personnel, privilégier les modèles équipés de batteries LFP — moins de lithium, pas de cobalt, et durée de vie élevée.",
        },
      },
      {
        id: "forced_change",
        label: "Le calendrier réglementaire me semble contraignant",
        response: {
          title: "Calendrier de la transition automobile en Europe",
          stats: [
            { value: "2035", label: "Fin de la vente de voitures neuves thermiques en Europe (règlement UE 2023/851).", source: "Règlement UE 2023/851" },
            { value: "2040-2050", label: "Horizon estimé pour que la majorité du parc en circulation soit électrifié.", source: "AIE 2024" },
            { value: "≈ 90 %", label: "Part des propriétaires actuels de véhicule électrique déclarant ne pas envisager de revenir au thermique.", source: "Kantar 2024" },
          ],
          insight: "L'échéance 2035 concerne uniquement la vente de véhicules neufs, pas les voitures déjà en circulation ni le marché de l'occasion. La transition réelle du parc s'étalera sur plusieurs décennies. La réglementation laisse aux ménages le temps de s'adapter à leur rythme.",
          tip: "Suivre les évolutions du barème de bonus écologique et de la prime à la conversion, qui orientent fortement le coût d'entrée selon les profils.",
        },
      },
    ],
  },
];

// ============================================================================
// Transformation → schéma g6k4ever.
// ============================================================================

const SCHEMA_VERSION = 1;

// Data ids:
const DATA_FAMILLE = 1;
const DATA_SUJET = 2;

const data = [
  {
    id: DATA_FAMILLE,
    name: "famille",
    label: "Quelle famille d'interrogation vous concerne ?",
    type: "choice",
    description: "Choisissez la grande catégorie qui correspond à votre question sur la voiture électrique.",
    options: CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
  },
  {
    id: DATA_SUJET,
    name: "sujet",
    label: "Précisez votre interrogation",
    type: "choice",
    description: "Sujet précis dans la famille sélectionnée.",
    options: CATEGORIES.flatMap((c) => c.subs.map((s) => ({ value: `${c.id}.${s.id}`, label: s.label }))),
  },
];

const sujetChapterId = (cat, sub) => `chap-sujet-${cat.id}-${sub.id}`;
const statsBlockId = (cat, sub) => `txt-stats-${cat.id}-${sub.id}`;
const insightBlockId = (cat, sub) => `txt-insight-${cat.id}-${sub.id}`;
const tipBlockId = (cat, sub) => `txt-tip-${cat.id}-${sub.id}`;

function formatStatsContent(stats) {
  // Markdown léger (whitespace pre-line) — chaque stat sur 2 lignes.
  return stats
    .map((s) => `• ${s.value} — ${s.label}\n  ↳ Source : ${s.source}`)
    .join("\n\n");
}

const responseBlocks = [];
for (const cat of CATEGORIES) {
  for (const sub of cat.subs) {
    responseBlocks.push({
      id: sujetChapterId(cat, sub),
      type: "chapter",
      config: {
        title: sub.response.title,
        blocks: [
          {
            id: statsBlockId(cat, sub),
            type: "text-section",
            config: {
              title: "Chiffres clés",
              variant: "info",
              content: formatStatsContent(sub.response.stats),
            },
          },
          {
            id: insightBlockId(cat, sub),
            type: "text-section",
            config: {
              title: "Analyse",
              variant: "default",
              content: sub.response.insight,
            },
          },
          {
            id: tipBlockId(cat, sub),
            type: "text-section",
            config: {
              title: "Conseil pratique",
              variant: "success",
              content: sub.response.tip,
            },
          },
        ],
      },
    });
  }
}

const steps = [
  {
    id: 1,
    name: "selection",
    label: "Choisissez votre interrogation",
    description: "Sélectionnez d'abord une famille, puis le sujet précis qui vous concerne.",
    blocks: [
      {
        id: "field-famille",
        type: "field",
        config: {
          dataId: DATA_FAMILLE,
          dataName: data[0].name,
          dataType: data[0].type,
          label: data[0].label,
          hint: data[0].description,
          required: true,
          options: data[0].options,
        },
      },
      {
        id: "chap-sujet-wrapper",
        type: "chapter",
        config: {
          title: "Précisez votre interrogation",
          blocks: [
            {
              id: "field-sujet",
              type: "field",
              config: {
                dataId: DATA_SUJET,
                dataName: data[1].name,
                dataType: data[1].type,
                label: data[1].label,
                hint: data[1].description,
                required: true,
                options: data[1].options,
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: 2,
    name: "reponse",
    label: "Ce que disent les données",
    description: "Chiffres clés, analyse synthétique et conseil pratique pour le sujet sélectionné.",
    blocks: responseBlocks,
  },
];

// ============================================================================
// Règles :
//   R0          : masquer le chapitre "Précisez votre interrogation" tant que famille=blank
//   R1..R17     : pour chaque sujet, masquer son chapter de réponse si sujet != "<cat>.<sub>"
//
// Logique : par défaut on cache (ifActions du connecteur all vide = always true).
// Astuce : on conditionne sur "sujet = <valeur>" → ifActions = showObject, elseActions = hideObject.
// ============================================================================

const rules = [];

// R0 : chapter "wrapper sujet" affiché seulement si famille present
rules.push({
  id: "r-show-sujet-wrapper",
  name: "Afficher la sélection du sujet quand une famille est choisie",
  conditions: {
    kind: "condition",
    operand: DATA_FAMILLE,
    operator: "present",
  },
  ifActions: [
    { kind: "showObject", target: { type: "chapter", id: "chap-sujet-wrapper" } },
  ],
  elseActions: [
    { kind: "hideObject", target: { type: "chapter", id: "chap-sujet-wrapper" } },
  ],
});

// Filtrer les options de sujet par famille : on cache l'étape 2 entière tant que sujet est blank.
rules.push({
  id: "r-show-step-reponse",
  name: "Afficher l'étape de réponse quand un sujet est sélectionné",
  conditions: {
    kind: "condition",
    operand: DATA_SUJET,
    operator: "present",
  },
  ifActions: [
    { kind: "showObject", target: { type: "step", id: 2 } },
  ],
  elseActions: [
    { kind: "hideObject", target: { type: "step", id: 2 } },
  ],
});

// Pour chaque sujet : afficher son chapter si sujet = "<cat>.<sub>", sinon le cacher.
for (const cat of CATEGORIES) {
  for (const sub of cat.subs) {
    const expectedValue = `${cat.id}.${sub.id}`;
    rules.push({
      id: `r-show-${cat.id}-${sub.id}`,
      name: `Afficher le chapitre du sujet ${cat.id}.${sub.id}`,
      conditions: {
        kind: "condition",
        operand: DATA_SUJET,
        operator: "=",
        value: `"${expectedValue}"`,
      },
      ifActions: [
        { kind: "showObject", target: { type: "chapter", id: sujetChapterId(cat, sub) } },
      ],
      elseActions: [
        { kind: "hideObject", target: { type: "chapter", id: sujetChapterId(cat, sub) } },
      ],
    });
  }
}

const simulator = {
  schemaVersion: SCHEMA_VERSION,
  metadata: {
    name: "fact-checker-voiture-electrique",
    label: "Fact-checker — voiture électrique",
    description:
      "Mise en perspective des idées reçues sur la voiture électrique. Sélectionnez une famille puis le sujet précis pour voir les chiffres-clés sourcés, une analyse et un conseil pratique. Wording institutionnel factuel (DGEC / portail-elec).",
    defaultLocale: "fr-FR",
    dateFormat: "dd/MM/yyyy",
    authors: ["DGEC", "portail-elec (legacy)"],
  },
  outputKind: "decision",
  data,
  sources: [],
  steps,
  rules,
  footnotes: [],
  groups: [],
};

writeFileSync(OUT, JSON.stringify(simulator, null, 2) + "\n");

console.log(`✅ Generated ${OUT}`);
console.log(`   Data       : ${data.length}`);
console.log(`   Steps      : ${steps.length}`);
console.log(`   Rules      : ${rules.length}`);
console.log(`   Chapters   : ${responseBlocks.length} (1 par sujet)`);
console.log(`   Total sujets : ${CATEGORIES.reduce((n, c) => n + c.subs.length, 0)}`);
