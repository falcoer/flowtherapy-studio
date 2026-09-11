# Prochaine session

0.1 fournit le noyau ; 0.2 fournit l'éditeur local minimal. Les PR 0.1 et 0.2 sont intégrées sur main.
La publication publique de l’application est autorisée (11 septembre 2026),
avec workflow Pages après tests et activation administrative à effectuer.
Lire `docs/editor.md`, `docs/core-api.md`, `docs/architecture.md` et `ROADMAP.md`.

Objectif suivant : jalon 0.3, templates et formats multiples.

1. Gestion des variantes au sein d'un même support et catalogue personnalisable.
2. Formulaires des bindings, overrides et sélections ordonnées d'événements.
3. Stabiliser une scène résolue commune et les mesures typographiques avec polices.
4. Débordements explicites, compactage et pagination sans perte de contenu.
5. Valider graphiquement les templates et zones de sécurité par format.
6. Conserver le stockage local, l'isolation des ajustements, le contrôle de
   révision et les échanges JSON/ZIP ; exécuter check et test:e2e.

Le DOM/CSS de 0.2 est un aperçu d'édition, pas un moteur d'export déterministe.
PNG/JPEG/PDF restent au jalon 0.4. Voir docs/github-pages.md pour le statut du déploiement.

## Laboratoire créatif

La branche feat/creative-lab introduit le laboratoire React + Motion et les
recettes v1 séparées des campagnes (voir creative-lab.md). Après intégration :
relier les recettes aux variantes via snapshots explicites, puis intégrer identité
de marque, ressources, dominante et sélection de contenu au moteur 0.3.

Organisation cible : [Branding, Ligne éditoriale, Campagnes](studio-organization.md).
Le laboratoire appartient à Campagnes > Direction créative. Préserver la différence
entre format, template, support et canal, ainsi que les statuts prévu/implémenté.
