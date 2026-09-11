# Architecture

## Découpage

- `src/domain` : documents, résolution des contenus, variantes, validation.
- `src/editor` : interface React/TypeScript, interactions et adaptateur d'aperçu DOM/CSS.
- `src/render/scene.ts` : scène résolue sérialisable, mesure injectée, ajustement
  typographique, compactage et pagination ; aucune dépendance React/DOM/cloud.
- `src/export` : futurs adaptateurs PNG, JPEG et PDF, non implémentés.
- `src/storage` : JSON, migrations explicites, ZIP ; IndexedDB avec révisions
  et ressources atomiques ; service partagé futur.
- `catalog` : formats, templates et assets intégrés, versionnés dans GitHub.

Pipeline actuel : campagne + snapshots → validation/résolution des champs et
placements (`resolveSupport`) → mesure avec les polices disponibles → layout et
pagination (`resolveScene`) → scène détachée → aperçu DOM/CSS.
Voir [contrats et limites de la scène](resolved-scene.md).

La mesure est injectée ; le domaine ne charge pas de police. L'adaptateur navigateur
charge les fichiers locaux par FontFace et mesure par Canvas 2D. Une fois chargées,
les mêmes familles servent au calcul et à l'affichage. Les lignes ne sont pas
remises en page par CSS ; le zoom ne modifie pas la pagination. Les polices absentes
ou invalides provoquent une substitution signalée, jamais un téléchargement externe.

Les futurs exports devront consommer la même scène et les mêmes ressources.
Évaluer SVG/Canvas et une bibliothèque PDF par un prototype de fidélité avant choix.
Préférer texte et formes vectoriels en PDF ; rasteriser uniquement les effets non
pris en charge. Ne pas promettre PDF/X ou CMJN via une simple option JSON.
La stabilité de la scène suppose des polices et mesures identiques ; une police
système de substitution ne garantit pas un rendu identique entre machines.

## Stockage

IndexedDB stocke les documents et blobs localement. JSON transporte les données
avec références ; ZIP transporte document + ressources + manifeste SHA-256.
À l'import : schéma, taille, chemins sûrs, types MIME, références et intégrité.
SVG refusés par le ZIP v1 ; nettoyage dédié requis pour les accepter.
Aucun script/HTML arbitraire évalué. Futures versions inconnues refusées proprement ;
migrations sur copie avec conservation de l'original.

Une interface de dépôt async list/load/save/delete isole la persistance ; save
accepte une révision attendue pour prévenir les écrasements. Supabase (PostgreSQL,
Auth, RLS et Storage privé) est la cible du futur adaptateur partagé, sans devenir
une dépendance du domaine. Aucune DB n'est obligatoire en fonctionnement local ni
table événement imposée. Les campagnes utilisateur restent hors dépôt source.
La scène calculée ne modifie ni les documents persistés ni leurs révisions.

## Confidentialité et hébergement

Build statique publié sur GitHub Pages ; l'accès public a été autorisé.
GitLab Pages dispose d'une configuration facultative, sans miroir créé.
Authentification et droits côté service pour une future API ; aucune clé admin client.
Stockage local soumis à effacement navigateur ; export explicite comme sauvegarde.

L'[intégration GitHub Pages](github-pages.md) publie main après tests, avec chemins
relatifs et publication de dist uniquement. Les campagnes ne sont pas publiées.
Le laboratoire a été déployé le 11 septembre 2026. Les harnais Chromium sous tests
ne sont pas des entrées du build de production.
Le frontal utilisera à terme `studio.flowtherapymusic.com` ; voir
[ADR 0002](decisions/0002-supabase-and-studio-domain.md).

## Publication et animation

Module facultatif avec destinations, capacités négociées, état et instantané des
médias/textes publiés. Jetons et programmation nécessiteront un service séparé ou
des fonctions natives de plateforme. Aucun secret dans les campagnes exportées.
Remotion pourra consommer les documents plus tard ; pas de dépendance initiale.

## Laboratoire créatif

`src/domain/creative.ts` porte les recettes v2 (migration v1) et leur résolution pure.
`src/editor/CreativeLab.tsx` fournit l'exploration React + Motion et un aperçu CSS.
Voir [contrats et limites](creative-lab.md). La scène générale ne transforme pas
encore tous les templates selon ces axes ; cette adaptation accompagne les futurs
templates artistiques. Les exports graphiques restent non implémentés.

## Organisation métier validée

Les quatre tiroirs sont Branding / Éditorial / Médias / Campagnes : des vues métier,
pas quatre silos de fichiers. Les ressources sont centralisées et référencées depuis
l'identité, les contenus et les campagnes. Médias porte formats, templates et canaux,
indépendamment du catalogue de contenus éditoriaux.

La Direction créative appartient à la campagne ; le laboratoire en est l'éditeur.
Ses cinq axes sont persistés et hérités par les supports. Les ajustements sont locaux
et explicites ; les recettes sont des préréglages réutilisables. JSON/ZIP préservent
axes et ajustements. Le socle Branding et IndexedDB v2 sont décrits dans
[Branding](branding.md). Les polices appliquées à une campagne sont maintenant
consommées par l'aperçu de ses supports.
Voir [organisation et décisions](studio-organization.md).
