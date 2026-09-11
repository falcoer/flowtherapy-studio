# Prochaine session

Le noyau 0.1 est implémenté. Lire `docs/core-api.md` et `docs/archive-format.md`.
Objectif suivant : jalon 0.2, éditeur statique minimal.

1. Préparer React/TypeScript sans API ni hébergement public automatique.
2. Permettre création et édition d'une campagne et de sa collection d'événements.
3. Activer un template et une variante via les snapshots du noyau.
4. Ajouter déplacement, recadrage et annulation/rétablissement des ajustements locaux.
5. Implémenter IndexedDB derrière CampaignStore avec révision attendue et gestion
   explicite des conflits ; intégrer les sauvegardes/imports JSON et ZIP existants.
6. Vérifier le parcours dans le navigateur et conserver les contrôles `npm run check`.

Les templates actuels restent des fixtures non validées graphiquement. Mesure du
texte, débordements/pagination, choix du moteur et exports PNG/JPEG/PDF restent à
implémenter. Le ZIP v1 accepte seulement STORE et rejette les SVG (voir contrat).
Aucun studio utilisable ni export graphique ne doit être annoncé sur le seul noyau.
