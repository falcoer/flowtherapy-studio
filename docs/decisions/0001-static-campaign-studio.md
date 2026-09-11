# ADR 0001 — Studio statique et campagnes autonomes

Statut : décisions de cadrage convenues le 2026-09-11.

1. Application statique, backend facultatif ; import/export opérationnels sans compte DB.
2. Campagne comme agrégat des contenus, supports et déclinaisons.
3. Événements comme collection structurée date/libellé/lieu à identifiants stables.
4. Template partagé avec variantes explicites par format ; aucun héritage géométrique complexe.
5. Snapshots embarqués et personnalisations par copie ; mises à jour explicites.
6. Catalogue commun GitHub et catalogue personnalisé distincts ; promotion par PR.
7. PNG/JPEG/PDF standard côté navigateur ; PDF/X et CMJN hors engagement initial.
8. Publication et animation futures via extensions, sans couplage au cœur.

Conséquences : documents plus volumineux mais portables ; travail de composition par
format assumé ; accès privé à configurer indépendamment de la visibilité GitHub.
Choix ouverts : moteur graphique/PDF, hébergeur final, fournisseur de persistance.
