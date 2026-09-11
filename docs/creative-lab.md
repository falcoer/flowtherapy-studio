# Laboratoire créatif — première version

Accessible à l'ouverture ou par `#laboratoire`. L'éditeur existant est accessible
par `#campagne`. Le passage entre les espaces conserve la campagne en mémoire.

## Disponible

- React + Motion ; animations respectant la préférence de mouvement réduit.
- Terrain énergie/densité à la souris et au toucher ; curseurs clavier équivalents.
- Trois préréglages, trois harmonies exploratoires, échelle typographique.
- Palette verrouillable lors des surprises et changements de préréglage.
- Exploration de quatre variantes proches ; retour sur les 30 réglages précédents.
- Aperçus carré, story 9:16 et affiche A4 ; titre et toutes les collections
  d'événements du contenu commun de la campagne. Aucun événement supprimé par densité.
- Recettes nommées enregistrées localement (50 maximum), suppression et import/export
  JSON. Validation stricte de version, clés, harmonies et valeurs 0–100.

## Contrats et limites

`src/domain/creative.ts` est indépendant de React et du stockage. `recipeVersion: 1`
versionne le format de recette séparément du document campagne v1. Toute version
future inconnue est refusée ; une évolution incompatible nécessitera une migration.
Les harmonies et la résolution sont définies par cette version. Les surprises
produisent des paramètres explicites ; leur résolution est ensuite reproductible.

Les recettes sont stockées sous `ft-studio:creative-recipes:v1` dans localStorage.
Elles ne sont pas incluses dans les JSON/ZIP de campagne. La recette courante et
l'historique sont en mémoire : enregistrer une recette et exporter son JSON pour
la conserver indépendamment du navigateur. Les erreurs de stockage sont affichées.

Ce laboratoire est une étude de direction, pas encore un template de production.
Il utilise une signature typographique et des ondes SVG natives, des polices système
et des palettes d'exploration, pas une identité de marque validée. La photo, la
sélection de contenu, les bindings/overrides de support, la dominante image/texte
et l'application d'une recette à une variante restent à intégrer au jalon 0.3.
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
