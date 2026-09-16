# Roadmap

| Jalon | Objectif | Critère de sortie | État |
| --- | --- | --- | --- |
| 0.0 | Cadrage, contrats et exemples | Décisions consultables, exemples contrôlés | Socle initial |
| 0.1 | Contrats validés et noyau campagne | Schémas runtime, migrations, round-trip JSON/ZIP sans perte, sélection d'événements | Intégré |
| 0.2 | Éditeur statique minimal | Créer une campagne et une variante ; saisir, déplacer, recadrer, annuler, sauvegarder | Intégré |
| 0.2 complément | Laboratoire créatif React + Motion | Exploration et recettes locales, aperçu multiformat | Intégré et publié sur Pages |
| 0.3 | Templates et formats multiples | Catalogue, variantes, personnalisations, débordements et pagination | En cours — Branding, scène résolue, Éditorial, médiathèque et template concert illustré intégrés |
| 0.3b | Configuration de marque | Release initiale, lot de changements, impact couleur, campagne préservée et migration explicite | Cadré — ADR 0004 et modèle cible |
| 0.4 | Exports | PNG/JPEG/PDF, fidélité texte, dimensions physiques, exports groupés | À faire |
| 0.5 | Studio privé utilisable | Assets autorisés, trois templates validés, accès groupe, recette A4/A3/social | À faire |
| 0.6 | Persistance partagée optionnelle | Adaptateur authentifié, conflits de révision, fichiers privés, autonomie locale conservée | À faire |
| Plus tard | Publication puis animation | Connecteurs validés par capacités réelles, instantanés publiés, service facultatif | Réserve |

GitHub Pages est actif avec l'accord du propriétaire ; main est publié après les
tests. Les campagnes restent locales. Le contrôle d'accès du futur studio partagé
n'est pas encore livré. Supabase est retenu pour l'adaptateur optionnel 0.6, sans
dépendance dans le domaine.

0.1 : voir [API](docs/core-api.md) et [archive v1](docs/archive-format.md).
ZIP STORE uniquement ; SVG non acceptés.

0.2 : voir [éditeur local](docs/editor.md). IndexedDB et sauvegardes JSON/ZIP ;
pas d'export graphique. Complément : [GitHub Pages](docs/github-pages.md) et
[laboratoire](docs/creative-lab.md) publié depuis le 11 septembre 2026.

## Décisions validées et priorité 0.3b

La navigation cible est désormais **Marque / Bibliothèque / Campagnes / Publications**.
Le branding devient une configuration structurée et versionnée ; sa charte est une
projection générée. Formats, templates et canaux restent des capacités contextuelles.
Les ressources et contenus sont centralisés dans Bibliothèque sans duplication.
Voir l'[ADR 0004](docs/decisions/0004-brand-configuration-management.md) et le
[modèle cible](docs/brand-configuration.md).

Tranches réalisées :

- Direction créative persistée dans la campagne : cinq axes, expression colorée,
  dominante, ressource image, héritage et ajustements locaux réinitialisables.
  Recettes v1 migrées vers v2 et copiées sans lien mutable.
- [Branding et ressources locales](docs/branding.md) : rôles, application explicite,
  stockage dédupliqué, IndexedDB v2, thème du studio et import des polices du site.
- [Scène résolue](docs/resolved-scene.md) : moteur indépendant de React, polices de
  l'instantané de campagne, mesure des textes, ajustement jusqu'aux minima, modes
  error/compact/paginate, navigation des pages et guides de sécurité. Aucun texte
  ni événement tronqué silencieusement. Les formats et campagnes ne changent pas
  de schéma ; les instantanés existants ne sont pas remplacés.

- [Éditorial et médiathèque](docs/editorial.md) : rédaction autonome, types/statuts,
  images associées, catalogue visuel, métadonnées, ZIP par article et des ressources,
  copies versionnées dans les campagnes, liaisons de contenu et Note éditoriale.
  Migration campagne v2→v3 et IndexedDB v2→v3, révisions/fichiers préservés.

Ces tranches ne clôturent pas le jalon 0.3. Le template **concert illustré multiformat**
est désormais au catalogue : composition éditable en calques, agenda, accent et
emplacements d’images pour la photo de scène et les trois alpagas, avec variantes
carré, portrait, story, A4 et A3. Restent la sélection des ressources autorisées,
l’application visuelle complète des axes créatifs, la validation graphique de chaque
format et les exports de production du jalon 0.4.

Le prochain incrément porte sur Brand Configuration : migration Brand v2 vers une
release initiale, brouillon du jeton color.primary, analyse d'impact, publication
atomique et migration explicite d'une campagne. Le catalogue de templates et les
exports reprennent ensuite sur cette base. La persistance partagée reste au jalon
0.6 ; aucune API cloud n'est activée.

Voir [décisions détaillées](docs/studio-organization.md),
[limites du rendu](docs/resolved-scene.md) et [prochaine étape](docs/next-step.md).
