# Roadmap

| Jalon | Objectif | Critère de sortie | État |
|---|---|---|---|
| 0.0 | Cadrage, contrats et exemples | Décisions consultables, exemples contrôlés | Socle initial |
| 0.1 | Contrats validés et noyau campagne | Schémas runtime, migrations, round-trip JSON/ZIP sans perte, sélection d'événements | Intégré |
| 0.2 | Éditeur statique minimal | Créer une campagne et une variante ; saisir, déplacer, recadrer, annuler, sauvegarder | Intégré |
| 0.2 complément | Laboratoire créatif React + Motion | Exploration et recettes locales, aperçu multiformat | Implémenté sur la branche, à intégrer |
| 0.3 | Templates et formats multiples | Catalogue, variantes, personnalisations, débordements et pagination | À faire |
| 0.4 | Exports | PNG/JPEG/PDF, fidélité texte, dimensions physiques, exports groupés | À faire |
| 0.5 | Studio privé utilisable | Assets autorisés, trois templates validés, accès groupe, recette A4/A3/social | À faire |
| 0.6 | Persistance partagée optionnelle | Adaptateur authentifié, conflits de révision, fichiers privés, autonomie locale conservée | À faire |
| Plus tard | Publication puis animation | Connecteurs validés par capacités réelles, instantanés publiés, service facultatif | Réserve |

L'automatisation des déploiements est postérieure au choix et à la validation de
la protection d'accès. Aucun fournisseur de DB ou moteur graphique n'est imposé.


0.1 : voir [API](docs/core-api.md) et [archive v1](docs/archive-format.md).
ZIP STORE uniquement ; SVG non acceptés. Aucun éditeur ni export graphique livré.

0.2 : voir [éditeur local](docs/editor.md). Aperçu DOM/CSS provisoire, IndexedDB
et sauvegardes JSON/ZIP ; aucun export graphique ni hébergement.

Complément 0.2 : intégration [GitHub Pages](docs/github-pages.md) préparée ;
publication de main après tests, visibilité publique acceptée le 11 septembre 2026 ;
activation administrative de Pages encore nécessaire.

Laboratoire : voir [périmètre et limites](docs/creative-lab.md). Le référentiel de
marque, les composants adaptatifs et l’application des recettes aux variantes
complètent le jalon 0.3 ; les exports restent au jalon 0.4.
