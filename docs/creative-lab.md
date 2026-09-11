# Direction créative — laboratoire de campagne

Accessible à l'ouverture ou par `#laboratoire`. L'éditeur existant est accessible
par `#campagne`. Le passage entre les espaces conserve la campagne en mémoire.

## Disponible

- React + Motion ; animations respectant la préférence de mouvement réduit.
- Cinq axes persistés : énergie, expression colorée, échelle graphique, densité
  et dominante Image/Texte/Équilibrée.
- Terrain énergie/densité à la souris et au toucher ; curseurs clavier équivalents.
- Trois préréglages, trois harmonies exploratoires, échelle typographique.
- Palette verrouillable lors des surprises et changements de préréglage.
- Exploration de quatre variantes proches ; retour sur les 30 réglages précédents.
- Aperçus carré, story 9:16 et affiche A4 ; titre et toutes les collections
  d'événements du contenu commun de la campagne. Aucun événement supprimé par densité.
- La Direction créative commune est enregistrée dans la campagne et transite par
  IndexedDB, JSON et ZIP. Un support l'hérite ou porte des ajustements locaux
  explicites et réinitialisables si son template déclare les capacités correspondantes.
- Une dominante Image ne peut être choisie qu'avec une ressource PNG/JPEG de la
  campagne ; cette ressource est affichée dans l'aperçu lorsqu'elle est disponible.
- Recettes nommées enregistrées localement (50 maximum), suppression et import/export
  JSON. Les recettes v1 sont migrées explicitement vers v2 ; les versions futures
  restent refusées.

## Contrats et limites

`src/domain/creative.ts` est indépendant de React et du stockage. `recipeVersion: 2`
versionne le format de recette séparément du document campagne v1. La migration
v1 → v2 initialise l'expression colorée à 50 et la dominante à Équilibrée. Toute
version future inconnue est refusée ; une autre évolution incompatible nécessitera une migration.
Les harmonies et la résolution sont définies par cette version. Les surprises
produisent des paramètres explicites ; leur résolution est ensuite reproductible.

Les recettes sont stockées sous `ft-studio:creative-recipes:v2` dans localStorage.
L'ancienne clé v1 est lue et son contenu valide est recopié en v2. Les recettes ne
sont pas incluses dans les JSON/ZIP : appliquer une recette en copie les valeurs
dans la campagne ou le support, sans dépendance mutable. Les erreurs sont affichées.

Ce laboratoire applique désormais la direction au document, mais reste une étude
graphique et non un template de production.
Il utilise une signature typographique et des ondes SVG natives, des polices système
et des palettes d'exploration, pas une identité de marque validée. La photo, la
sélection de contenu, les bindings/overrides de support, la dominante image/texte
et la scène résolue commune restent à intégrer au jalon 0.3.
Le changement de format est un aperçu : aucune variante de campagne n'est créée.
Les débordements sont signalés et le contenu reste visible. PNG/JPEG/PDF restent
au jalon 0.4 ; le rendu typographique n'est pas garanti identique entre machines.

## Hébergement statique

Vite produit `dist/` avec chemins relatifs ; navigation par fragment compatible
avec GitHub Pages et GitLab Pages. Aucun Node.js n'est requis côté hébergement.
Le workflow GitHub Pages existant est conservé. `.gitlab-ci.yml` permet à un miroir
GitLab de vérifier puis publier `dist/` depuis la branche par défaut (syntaxe
`pages.publish`, GitLab >= 17.9). Aucun miroir ni site GitLab n'est créé ici.
GitLab Pages doit être configuré sur une instance auto-hébergée.

## Vérification

`npm run check` valide le domaine et le build. `npm run test:e2e` couvre aussi le
laboratoire, le clavier, le retour, les recettes persistées, la continuité de
campagne, le verrouillage de palette, le débordement et le viewport mobile.

## Décision mise en œuvre

Le laboratoire édite la Direction créative de la campagne : énergie, expression
colorée, échelle graphique, densité et dominante. La campagne enregistre cette
direction et la transmet à ses supports avec ajustements locaux explicites.
Les recettes servent à réutiliser les réglages par copie.
L'apparence du studio et des médias reste provisoire.
Voir [les décisions de référence](studio-organization.md#direction-créative--modèle-retenu).
