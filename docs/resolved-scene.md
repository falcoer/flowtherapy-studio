# Scène résolue — tranche 0.3

## Livré

`src/render/scene.ts` est un moteur sans React, DOM, stockage ou fournisseur cloud.
Il consomme les champs et placements validés par `resolveSupport`, ainsi que les
familles réellement chargées et une fonction de mesure injectée. Il produit une
scène sérialisable `sceneVersion: 1` : format, pages, calques, lignes de texte,
cellules d'événements positionnées et avertissements. Les entrées ne sont pas
modifiées ; les pages ne partagent pas de placement mutable.

L'aperçu des supports utilise cette scène. Les retours à la ligne et la pagination
ne dépendent pas de la largeur de la fenêtre : le zoom met à l'échelle les unités
logiques du format, pixels ou millimètres.

### Typographie et branding

Les polices de l'instantané de campagne sont chargées depuis ses fichiers locaux
par `FontFace`, jamais par une URL distante. `style.font = "brand:<rôle>"` résout
un rôle explicite. Sans police déclarée, le calque `title` utilise le rôle `title`
et les autres textes/listes le rôle `body` lorsqu'ils sont affectés. Une police
littérale déclarée dans le template reste prioritaire. Les couleurs `brand:<rôle>`
continuent d'être résolues ; les couleurs littérales ne sont pas remplacées.

Les fichiers TTF, OTF, WOFF et WOFF2 sont acceptés. Les fichiers absents ou illisibles
produisent une substitution signalée, sans bloquer la campagne. Le chargement
réussi provoque une nouvelle mesure ; restaurer un ZIP manquant recharge les
polices. Les `FontFace` appartiennent à l'aperçu et sont libérées à son démontage.
Une modification de texte ne recharge pas les polices inchangées.

La mesure utilise Canvas 2D dans l'adaptateur navigateur, puis le DOM affiche les
lignes calculées sans les réinterpréter. `textFit: shrink` réduit jusqu'au minimum
autorisé en tenant compte de la largeur, hauteur et du nombre de lignes. Les mots
trop longs sont séparés aux limites de graphèmes ; les espaces et le texte source
sont conservés. Si le minimum ne suffit pas, le texte entier reste visible avec
un avertissement. Le mode `error` conserve la taille demandée.

### Événements et sécurité

Les modes table/list utilisent des colonnes mesurées ; cards empile les champs.
Les dates civiles sont formatées sans conversion de fuseau horaire.

- `paginate` : un événement n'est jamais coupé entre deux pages. Les autres
  calques sont répétés. Un événement trop haut pour une page reste intégral et
  déclenche un avertissement. Une seule collection paginée par variante.
- `compact` : réduction de la taille et de l'espacement jusqu'aux minima déclarés.
- `error` ou compactage insuffisant : contenu intégral et avertissement explicite.

L'aperçu propose Page précédente/suivante et un bouton Zones de sécurité, masquées
par défaut. Les dépassements de surface tiennent compte de la rotation ; les
textes et collections sont contrôlés contre les marges et zones d'exclusion.
Les intersections avec une exclusion utilisent la boîte englobante après
rotation : ce contrôle est conservateur, pas une détection polygonale exacte.
Le déplacement par souris/clavier et les ajustements locaux restent disponibles.

## Limites et suite

Cette tranche n'est pas encore le rendu artistique final. L'affiche de référence
fournie le 11 septembre 2026 fixe la direction : fond photographique guitare et
lumières de scène, titre expressif, agenda multi-événements en colonnes, accents,
soulignements et ornements, trois alpagas colorés au premier plan inférieur.
Elle guide le prochain template, sans être intégrée comme image aplatie.

Restent à construire : template concert illustré multiformat, composition en
plusieurs blocs/colonnes d'événements, ressources autorisées d'alpagas et ornements,
effets graphiques et application des cinq axes créatifs à cette scène générale.
Les capacités créatives déjà éditables ne constituent pas encore un moteur de
transformation universel de tous les templates.

Les graphiques SVG importés, les QR et les exports PNG/JPEG/PDF restent non livrés.
Les logos ne sont pas ajoutés automatiquement à une composition sans calque dédié.
Les polices système de substitution et les différences de moteurs de navigateur
ne garantissent pas un rendu identique entre machines. La détermination de la
scène suppose les mêmes données, polices et résultats de mesure. La future chaîne
d'export devra consommer cette scène et les mêmes ressources, sans refaire le layout.

Aucun changement du schéma de campagne, de révision persistée ou d'instantané de
catalogue ; aucune migration ni ressource réelle ajoutée aux fixtures.

## Vérifications

`npm run check` et `npm run test:e2e` exécutent les tests de non-régression.
`tests/scene.test.ts` couvre conservation/ordre, isolation, JSON, graphèmes, ajustement,
compactage, pagination, dates, polices, sécurité et coordonnées logiques.
La recette Chromium `tests/e2e/scene.spec.ts` utilise un harnais de données fictives
non inclus dans le build de production : pagination, mobile, clavier, guides,
police locale, absence de requête externe, chargement/repli/restauration et nettoyage.
