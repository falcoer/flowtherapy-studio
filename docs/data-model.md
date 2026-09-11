# Modèle de données v1 (jalon 0.1)

Contrats : `src/domain/model.ts`, schémas exportables dans `schemas/domain.schema.json`.
Validation runtime et résolution : `src/domain/core.ts`. Les exemples servent de fixtures, pas de templates graphiques validés.

## Identité et versions

`schemaVersion` définit la structure sérialisée. `revision` identifie une édition
de définition ou de campagne. Une Ref désigne exactement id+revision.
`derivedFrom` est une provenance, jamais une fusion implicite à l'ouverture.
IDs communs préfixés `ft:`, personnalisés avec un préfixe utilisateur et UUID.
Pas de remplacement automatique du catalogue par collision d'identifiant.

## Format

Surface = résultat visible, en px ou mm. Origine en haut à gauche. Bleed extérieur,
safeInset intérieur ; tous deux dans l'unité de surface, comme frames et tailles de
police. Un A4 210×297 avec 3 mm de bleed produit 216×303 mm avant repères.
Les repères occupent une marge supplémentaire de l'exporteur, hors bleed.
Résolution scale pour px, dpi pour mm ; pixels = arrondi(mm × dpi / 25,4).
Ratio et orientation calculés. PNG transparent possible, JPEG fond opaque.
PDF rasterDpi concerne les images/effets, pas le texte vectoriel. PDF d'un format
en px exige une convention de taille physique : non pris en charge au départ.

## Template et variantes

Champs typés, sources fixes ou liées ; calques indépendants de leurs placements.
Une layout référence un format versionné ; géométrie et ordre de peinture complets.
Références de style `brand:...` résolues dans le snapshot de charte, sinon erreur.
Police locale incorporable requise pour export fidèle ; aucune substitution silencieuse.
Le template déclare toutes les variantes, le support n'en active qu'une sélection.
Validation structurelle distincte de validation graphique (status draft/validated).

## Campagne et résolution

La campagne porte une `creativeDirection` v1 additive et rétrocompatible : quatre
axes continus 0–100, une dominante, une harmonie et, si nécessaire, une référence
d'image. Un document v1 antérieur sans direction reçoit les valeurs par défaut à
la résolution sans réécriture silencieuse. Chaque support hérite de la direction ;
ses `creativeOverrides` ne peuvent porter que les axes/dominantes déclarés dans
`template.creativeCapabilities`. Supprimer ces overrides rétablit l'héritage.

Pour chaque champ : override du support s'il existe (tester présence, pas vérité),
sinon contenu lié, sinon défaut du template ; champ obligatoire absent = erreur.
Puis sélection d'événements : all conserve l'ordre enregistré, ids respecte l'ordre
des ids demandés ; id absent ou répété = erreur. Overrides d'une collection autorisés
explicitement seulement, jamais déduits d'un changement de mise en page.

Chaque support embarque son template. Chaque variante active embarque son format.
Charte et assets nécessaires sont embarqués/résolus à l'export ZIP. Des formats
inactifs peuvent rester référencés par le template mais ne sont pas requis au rendu.
Les snapshots sont immuables jusqu'à migration/mise à jour explicite.

Placement overrides : remplacement par propriété ; un frame fourni remplace le frame
entier. Aucun patch récursif implicite. Réinitialiser supprime la propriété override.

## Événements et pagination

Collection core:event@1 : id, date civile ISO valide, label et location.
La donnée ne contient aucun rendu localisé. Date présentée avec locale de campagne.
La première version emploie un calque event-list spécialisé et déclaratif.
L'overflow error bloque ; compact respecte les minima puis bloque ; paginate génère
des pages avec calques fixes répétés. Une seule collection paginée par layout en V1.
En-tête et pied répétés, ordre stable, contrôle de chaque page. Un élément plus haut
qu'une page reste une erreur, jamais une boucle de pagination ou une troncature.

## Persistance et personnalisation

Même document campagne pour fichier/IndexedDB/DB JSON. Révisions attendues pour
save/delete ; null à la création seulement. Le fournisseur reste un adaptateur.
La galerie partagée est facultative. Personnalisations stockées séparément du catalogue
commun. Export contribution pour revue GitHub, pas d'écriture GitHub depuis le client.

## Extensions réservées

Modèles de campagne regroupant supports, futures publications avec instantanés,
destinations/capacités et statuts ; schémas à définir aux jalons correspondants.
Pas de secrets sociaux, de fonctions JS ou d'expressions exécutables dans les JSON.
