# Architecture

## Découpage cible

- `src/domain` : documents, résolution des contenus, variantes, validation.
- `src/editor` : interface React/TypeScript et aperçu DOM/CSS provisoire (0.2).
- `src/render` : future scène résolue commune à aperçu et export.
- `src/export` : futurs adaptateurs PNG, JPEG, PDF et ZIP.
- `src/storage` : import/export JSON, migrations explicites et ZIP implémentés ;
  adaptateur IndexedDB avec révisions et ressources atomiques (0.2) ; service partagé futur.
- `catalog` : formats, templates et assets intégrés, versionnés dans GitHub.

Ces dossiers futurs ne désignent pas des modules déjà implémentés.

Pipeline : campagne + snapshots → champs résolus → sélection des événements →
layout/pagination → scène graphique figée → aperçu et exports.
Le moteur de mesure des textes, les polices et les ressources doivent être communs.
Évaluer SVG/Canvas et une bibliothèque PDF par un prototype de fidélité avant choix.
Préférer du texte et des formes vectoriels en PDF ; rasteriser uniquement les effets
non pris en charge. Ne pas promettre PDF/X ou CMJN via une simple option JSON.

## Stockage

IndexedDB stocke les documents et blobs localement. JSON seul transporte les données
avec références ; ZIP transporte document + ressources + manifeste de sommes SHA-256.
À l'import : schéma, taille, chemins sûrs, types MIME, références et intégrité.
SVG actuellement refusés par le ZIP v1 ; nettoyage dédié requis pour les accepter.
Aucun script/HTML arbitraire évalué. Futures versions inconnues
refusées proprement ; migrations sur copie avec conservation de l'original.

Une interface de dépôt async list/load/save/delete isole la persistance ; save doit
accepter une révision attendue pour prévenir les écrasements en stockage partagé.
DB JSON + stockage objet possibles, pas de DB obligatoire ni table événement imposée.
Les campagnes restent des données utilisateur hors dépôt source.

## Confidentialité et hébergement

Build statique, hébergement gratuit envisagé. Cloudflare est un candidat, à confirmer
au déploiement selon les offres et la protection du domaine et des URL alternatives.
Authentification et droits côté service pour une future API ; aucune clé admin client.
Stockage local soumis à effacement navigateur ; export explicite comme sauvegarde.

## Publication et animation

Module facultatif avec destinations et capacités négociées, état et instantané des
médias/textes publiés. Jetons et programmation nécessiteront un service séparé ou
des fonctions natives de plateforme. Aucun secret dans les campagnes exportées.
Remotion pourra consommer les documents plus tard ; pas de dépendance initiale.


Voir [éditeur 0.2](editor.md) pour le parcours, les conflits et les limites réelles
de cet aperçu, distinct du moteur déterministe futur.

Une [intégration GitHub Pages](github-pages.md) est préparée après 0.2 :
workflow manuel, build relatif au chemin, publication de dist uniquement.
Son activation attend une décision explicite sur l’accès public du studio.
