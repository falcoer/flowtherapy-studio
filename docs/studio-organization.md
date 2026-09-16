# Organisation cible de Flow Therapy Studio

Décisions initiales validées le 11 septembre 2026, puis rationalisées le
16 septembre 2026 par l'[ADR 0004](decisions/0004-brand-configuration-management.md).

Flow Therapy Studio est un système de gestion de configuration de marque et un
studio de campagne. La navigation principale est :

**Marque / Bibliothèque / Campagnes / Publications**

Le référentiel structuré est la source de vérité. Les guides, aperçus et documents
sont des projections générées.

## Principes d'interaction

Le shell reste identique dans les quatre espaces :

- navigation principale à gauche ;
- liste ou catalogue contextuel ;
- espace de travail central ;
- inspecteur de propriétés, règles et impacts à droite ;
- version publiée et brouillon courant toujours visibles.

Les objets partagent identifiant, type, statut, révision, relations, usages et
historique. Les éditeurs restent spécialisés : nuancier pour les couleurs,
spécimens pour les polices, galerie pour les logos et canevas pour les productions.

## 1. Marque

Marque contient la configuration stable et versionnée.

### Fondations

- positionnement, mission, promesse, valeurs et publics ;
- voix, vocabulaire et formulations ;
- responsabilités et crédits ;
- principes de composition et d'expression.

### Identité visuelle

| Objet | Informations et règles |
| --- | --- |
| Logos | variantes, fonds compatibles, zone de protection, taille minimale |
| Couleurs | jetons sémantiques, thèmes, associations et contrastes |
| Typographies | fichiers, graisses, rôles, échelles et remplacements |
| Photos | sujet, crédit, droits, point focal et recadrages |
| Illustrations | famille, recoloration et règles de composition |
| Composants | structure, paramètres, variantes et contraintes |
| Mises en page | zones, hiérarchie, formats et adaptation |

Chaque modification rejoint un lot de changements. Avant publication, le système
présente ses dépendances, contrôles et migrations. Une release publiée est immuable.

Le guide de marque reste disponible comme vue générée d'une release.

## 2. Bibliothèque

Bibliothèque centralise la matière réutilisable :

- ressources binaires : images, vidéos, sons, documents et polices ;
- contenus : événements, articles, annonces et présentations ;
- collections, tags, recherche et statuts ;
- crédits, provenance, licences et droits ;
- usages dans la marque, les campagnes et les productions.

Une ressource est stockée une seule fois. Chaque contexte conserve ses propres
références, recadrages et paramètres. Une campagne dépend d'un instantané explicite
du contenu, jamais d'une lecture mutable au moment du rendu.

La ligne éditoriale est un ensemble de règles de marque appliquées aux contenus ;
elle n'est pas un silo de navigation.

## 3. Campagnes

Une campagne assemble un objectif, des contenus, une version de marque et des
capacités de production.

| Onglet | Responsabilité |
| --- | --- |
| Brief | objectif, public, message et période |
| Contenus | événements, articles, ordre et ressources |
| Direction | axes créatifs, recette et références |
| Productions | templates, formats, variantes et validation |
| Diffusion | préparation des exports et publications |

Une campagne est rattachée à une release de marque ou à son instantané. La migration
vers une release ultérieure est explicite et précédée d'une analyse d'impact.

### Direction créative

Le laboratoire est l'éditeur de la Direction d'une campagne, pas un espace métier
autonome.

| Axe | Réglage | Effets attendus |
| --- | --- | --- |
| Énergie | Calme → Explosive | inclinaison, contrastes de taille, rythme, ornements |
| Expression colorée | Sobre → Vibrante | étendue et intensité de la palette autorisée |
| Échelle graphique | Délicate → Monumentale | taille relative du titre, de la photo et du symbole |
| Densité | Aérée → Compacte | espacements, détails et organisation des blocs |
| Dominante | Image / Texte / Équilibrée | répartition de l'espace et priorité visuelle |

Les supports héritent de ces axes et peuvent porter des ajustements locaux,
explicites et réinitialisables.

## 4. Publications

Publications rassemble les résultats produits, indépendamment de leur campagne
d'origine :

- créations à valider ;
- exports PNG, JPEG et PDF ;
- paquets multiformats ;
- calendrier et états de diffusion ;
- publications futures vers les canaux connectés ;
- lien vers la campagne, le template, les contenus et la release utilisés.

Une publication conserve un instantané reproductible de sa production.

## Capacités transverses

Formats, templates et canaux ne forment plus un espace principal.

| Objet | Rôle | Point d'accès principal |
| --- | --- | --- |
| Format | dimensions, ratio, unités, sécurité et sortie | production |
| Template | champs, composants, composition et variantes | production et catalogue |
| Canal | contraintes et destination | diffusion |
| Recette | préréglage de direction | campagne |
| Règle | validation et conformité | marque et inspecteur |

## État réel

Sont intégrés sur `main` :

- noyau de campagne et éditeur statique ;
- direction créative persistée ;
- Branding v2, palettes, logos, polices et ressources dédupliquées ;
- instantanés explicites appliqués aux campagnes ;
- scène mesurée et paginée ;
- Éditorial local et médiathèque ;
- template concert illustré multiformat.

Ne sont pas encore livrés :

- modèle Brand Configuration décrit par l'ADR 0004 ;
- lots de changements et graphe de dépendances ;
- analyse d'impact et releases immuables ;
- nouveau shell Marque / Bibliothèque / Campagnes / Publications ;
- exports graphiques de production ;
- persistance partagée et publication sociale.

## Priorité

La première tranche est volontairement verticale :

1. migrer Brand v2 vers une release initiale ;
2. modifier le jeton `color.primary` dans un brouillon ;
3. calculer contrastes et dépendances ;
4. publier une nouvelle release ;
5. préserver une campagne existante ;
6. migrer explicitement une campagne de test.

Voir [modèle cible et migration](brand-configuration.md) et la
[roadmap](../ROADMAP.md).
