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

Pipeline : campagne + snapshots → résolution des contrats de contenus → champs résolus →
sélection/ordre des contenus → layout/pagination → scène graphique figée → aperçu et exports.
Le moteur de mesure des textes, les polices et les ressources doivent être communs.
Évaluer SVG/Canvas et une bibliothèque PDF par un prototype de fidélité avant choix.
Préférer du texte et des formes vectoriels en PDF ; rasteriser uniquement les effets
non pris en charge. Ne pas promettre PDF/X ou CMJN via une simple option JSON.

## Architecture métier

Le studio distingue quatre vues métier : **Branding / Éditorial / Médias / Campagnes**.
Elles forment un parcours de communication, mais ne sont pas quatre silos techniques.

- Branding : configuration durable d'une marque unique dans la première cible.
- Éditorial : contenus typés persistés indépendamment des campagnes.
- Médias : formats, templates, canaux et destinations réutilisables.
- Campagnes : orchestration d'un pool de contenus, d'une direction créative et de supports.

Les campagnes héritent de la marque et des configurations média. Les écarts sont des
overrides explicites et réinitialisables, pas des copies implicites sans provenance.

Les templates déclarent leurs besoins via des contrats d'entrée typés et cardinalisés.
Une campagne peut donc référencer quatre événements riches, tandis qu'un template
`1..N event` n'en consomme que date, ville et label pour une story. Un autre template
peut consommer les mêmes objets avec description et photographie. La sémantique
d'agrégation appartient au contrat du template plutôt qu'à une structure générique
opaque de campagne.

## Stockage

IndexedDB stocke les documents et blobs localement. JSON seul transporte les données
avec références ; ZIP transporte document + ressources + manifeste de sommes SHA-256.
À l'import : schéma, taille, chemins sûrs, types MIME, références et intégrité.
SVG actuellement refusés par le ZIP v1 ; nettoyage dédié requis pour les accepter.
Aucun script/HTML arbitraire évalué. Futures versions inconnues
refusées proprement ; migrations sur copie avec conservation de l'original.

Une interface de dépôt async list/load/save/delete isole la persistance ; save doit
accepter une révision attendue pour prévenir les écrasements en stockage partagé.
Le domaine ne dépend pas de l'adaptateur : les mêmes contrats doivent fonctionner avec
IndexedDB, fichier/ZIP et un service distant.

### Stratégie local-first

La première cible reste un frontend entièrement statique, fonctionnel hors connexion
pour les données déjà locales. IndexedDB constitue la persistence locale principale.
Une synchronisation ou un repository distant pourront ensuite être ajoutés sans changer
le modèle de domaine.

La cible privilégiée pour les données partagées est PostgreSQL, éventuellement complété
par JSONB pour certaines extensions versionnées. Le navigateur ne doit jamais ouvrir
de connexion PostgreSQL directe : il passe par une API HTTPS qui gère authentification,
autorisation et concurrence.

Supabase est une option d'implémentation crédible pour fournir PostgreSQL, API, stockage
d'objets et authentification. Il doit rester derrière les interfaces de repository afin
de pouvoir être remplacé sans refonte du domaine.

Les identifiants utilisateur doivent être stables, idéalement UUID, afin de permettre
export/import, migration et future synchronisation locale/distante.

## Confidentialité et hébergement

Build statique publié sur GitHub Pages ; l'accès public a été autorisé.
GitLab Pages dispose d'une configuration facultative, sans miroir créé.
Authentification et droits côté service pour une future API ; aucune clé admin client.
Stockage local soumis à effacement navigateur ; export explicite comme sauvegarde.

L'URL canonique cible du studio est **studio.flowtherapymusic.com**. Le sous-domaine
peut pointer vers GitHub Pages aujourd'hui et rester inchangé si l'hébergement ou le
backend évoluent. Une évolution vers une PWA installable est compatible avec cette
architecture statique et local-first.

Les éventuels traitements planifiés côté GitHub ou backend doivent répondre à de vrais
besoins de maintenance, sauvegarde ou contrôle d'intégrité ; ils ne doivent pas exister
uniquement pour fabriquer artificiellement de l'activité sur un service tiers.

## Publication et animation

Module facultatif avec destinations et capacités négociées, état et instantané des
médias/textes publiés. Jetons et programmation nécessiteront un service séparé ou
des fonctions natives de plateforme. Aucun secret dans les campagnes exportées.
Remotion pourra consommer les documents plus tard ; pas de dépendance initiale.

Le futur planning éditorial pourra exploiter objectifs, contenus, campagnes et états
de publication pour suivre la présence sur les réseaux et proposer des actions, sans
faire partie du moteur de rendu déterministe initial.

Voir [éditeur 0.2](editor.md) pour le parcours, les conflits et les limites réelles
de cet aperçu, distinct du moteur déterministe futur.

L'[intégration GitHub Pages](github-pages.md) est active après 0.2 :
publication de main après tests, build relatif au chemin, publication de dist uniquement.
Le dépôt et l’application sont publics avec l’accord du propriétaire.
Les données de campagne ne sont pas publiées. Le laboratoire a été déployé le 11 septembre 2026.

## Laboratoire créatif

`src/domain/creative.ts` porte les recettes v1 et leur résolution pure.
`src/editor/CreativeLab.tsx` fournit l’exploration React + Motion et un aperçu CSS.
Ce complément ne modifie pas les contrats campagne v1 ni le pipeline d’export.
Voir [contrats et limites](creative-lab.md).

## Organisation métier validée

Les quatre tiroirs sont Branding / Éditorial / Médias / Campagnes ; ils sont des
vues métier, pas quatre silos de fichiers. Les ressources sont centralisées et
référencées depuis l'identité, les contenus et les campagnes. Médias porte formats,
templates et canaux, indépendamment du catalogue de contenus éditoriaux.

La Direction créative appartient à la campagne ; le laboratoire en est l'éditeur.
Ses cinq axes sont persistés dans le modèle cible et hérités par les supports.
Les ajustements restent locaux et explicites ; les recettes sont des préréglages
réutilisables. Cette cible exige encore une évolution des contrats et du stockage,
avec migrations explicites et round-trips sans perte.
Voir [organisation et décisions](studio-organization.md).
