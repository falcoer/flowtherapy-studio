# Roadmap

| Jalon          | Objectif                           | Critère de sortie                                                                         | État                                   |
| -------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------- |
| 0.0            | Cadrage, contrats et exemples      | Décisions consultables, exemples contrôlés                                                | Socle initial                          |
| 0.1            | Contrats validés et noyau campagne | Schémas runtime, migrations, round-trip JSON/ZIP sans perte, sélection d'événements       | Intégré                                |
| 0.2            | Éditeur statique minimal           | Créer une campagne et une variante ; saisir, déplacer, recadrer, annuler, sauvegarder     | Intégré                                |
| 0.2 complément | Laboratoire créatif React + Motion | Exploration et recettes locales, aperçu multiformat                                       | Intégré et publié sur Pages            |
| 0.3            | Templates et formats multiples     | Catalogue, variantes, personnalisations, débordements et pagination                       | En cours — Branding et ressources implémentés |
| 0.4            | Exports                            | PNG/JPEG/PDF, fidélité texte, dimensions physiques, exports groupés                       | À faire                                |
| 0.5            | Studio privé utilisable            | Assets autorisés, trois templates validés, accès groupe, recette A4/A3/social             | À faire                                |
| 0.6            | Persistance partagée optionnelle   | Adaptateur authentifié, conflits de révision, fichiers privés, autonomie locale conservée | À faire                                |
| Plus tard      | Publication puis animation         | Connecteurs validés par capacités réelles, instantanés publiés, service facultatif        | Réserve                                |

L'automatisation des déploiements est postérieure au choix et à la validation de
la protection d'accès. Supabase est retenu pour le futur adaptateur partagé 0.6,
sans dépendance dans le domaine ; aucun moteur graphique n'est encore imposé.

0.1 : voir [API](docs/core-api.md) et [archive v1](docs/archive-format.md).
ZIP STORE uniquement ; SVG non acceptés. Aucun éditeur ni export graphique livré.

0.2 : voir [éditeur local](docs/editor.md). Aperçu DOM/CSS provisoire, IndexedDB
et sauvegardes JSON/ZIP ; aucun export graphique.

Complément 0.2 : [GitHub Pages](docs/github-pages.md) actif ; laboratoire publié
après tests le 11 septembre 2026 (PR #4).

Laboratoire : voir [périmètre et limites](docs/creative-lab.md). Le référentiel de
marque, les composants adaptatifs et l’application des recettes aux variantes
complètent le jalon 0.3 ; les exports restent au jalon 0.4.

## Décisions validées et priorité 0.3

Navigation : **Branding / Éditorial / Médias / Campagnes**.
Éditorial réunit contenus et ressources liées ; Ligne éditoriale est une sous-section.
Médias regroupe formats, templates et canaux. Les ressources sont centralisées et
référencées sans duplication entre les tiroirs.

Tranche intégrée : Direction créative persistée dans la campagne (cinq axes),
expression colorée distincte de la palette, dominante, ressource image, héritage
vers les supports et ajustements locaux réinitialisables selon les capacités du
template. Les recettes v1 sont migrées vers v2 et copiées, sans lien mutable.

Tranche suivante implémentée : [socle Branding et ressources locales](docs/branding.md),
identité par rôles, application explicite aux campagnes, stockage dédupliqué et
migration IndexedDB v2.

Complément implémenté : [préréglage du site Flow Therapy](docs/branding-flowtherapy.md),
palettes claire/sombre, logo et polices issus du dépôt du site à un commit figé,
contrôle des ressources, aperçu de l’identité et préservation des personnalisations.
Ce complément ne constitue pas encore le rendu des rôles par les templates.

Priorité suivante : catalogue de templates et scène résolue ; enrichissement
progressif du Branding et de l’Éditorial. La persistance éditoriale partagée reste
planifiée au jalon 0.6, après l’adaptateur authentifié, la gestion des droits et les
conflits de révision ; aucune API cloud n’est livrée dans le jalon 0.3. Le rendu
graphique définitif reste à construire, à partir de l’identité du site désormais
configurée. Voir [décisions détaillées](docs/studio-organization.md) et
[critère de sortie](docs/next-step.md).
