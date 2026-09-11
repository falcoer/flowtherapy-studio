# Prochaine session

0.1 fournit le noyau ; 0.2 fournit l'éditeur local minimal. Vérifier l'intégration
successive des PR 0.1 puis 0.2 avant de baser la suite sur main.
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
PNG/JPEG/PDF restent au jalon 0.4. Aucun hébergement public automatique.
