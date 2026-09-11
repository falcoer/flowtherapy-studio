# Modèle de données v1 (jalon 0.1)

Contrats : `src/domain/model.ts`, schémas exportables dans `schemas/domain.schema.json`.
Validation runtime et résolution : `src/domain/core.ts`. Les exemples servent de fixtures, pas de templates graphiques validés.

## Identité et versions

`schemaVersion` définit la structure sérialisée. `revision` identifie une édition
de définition ou de campagne. Une Ref désigne exactement id+revision.
`derivedFrom` est une provenance, jamais une fusion implicite à l'ouverture.
IDs communs préfixés `ft:`, personnalisés avec un préfixe utilisateur et UUID.
Pas de remplacement automatique du catalogue par collision d'identifiant.

La cible fonctionnelle reste mono-marque : une identité globale est configurée pour
le studio, puis héritée par les campagnes et leurs supports. Le modèle ne doit pas
introduire prématurément un catalogue multi-marques.

## Format

Surface = résultat visible, en px ou mm. Origine en haut à gauche. Bleed extérieur,
safeInset intérieur ; tous deux dans l'unité de surface, comme frames et tailles de
police. Un A4 210×297 avec 3 mm de bleed produit 216×303 mm avant repères.
Les repères occupent une marge supplémentaire de l'exporteur, hors bleed.
Résolution scale pour px, dpi pour mm ; pixels = arrondi(mm × dpi / 25,4).
Ratio et orientation calculés. PNG transparent possible, JPEG fond opaque.
PDF rasterDpi concerne les images/effets, pas le texte vectoriel. PDF d'un format
en px exige une convention de taille physique : non pris en charge au départ.

## Contenus éditoriaux

Le contenu est persisté indépendamment des campagnes. Il constitue la source de vérité
éditoriale réutilisable par plusieurs campagnes et plusieurs templates.

Un contenu possède au minimum un identifiant stable, une nature typée, un titre ou
libellé lorsque pertinent, un statut et ses métadonnées propres. Des objectifs
éditoriaux stables peuvent lui être associés pour recherche, classification et futures
suggestions de communication.

Types envisagés : `event`, `article`, `announcement`, `presentation`. La liste est
extensible par version de schéma, sans transformer chaque type en simple dictionnaire
non validé.

### Événement riche

`core:event@2` cible un événement éditorial complet :

- `id` stable ;
- date/heure ou période ;
- label/titre ;
- lieu et ville ;
- description courte ;
- description longue facultative ;
- références de ressources éditoriales (photo du lieu, organisateur, document...) ;
- objectifs éditoriaux et statut.

La V1 existante `core:event@1` (`id`, date civile, label, location) reste un contrat
historique à migrer explicitement plutôt qu'à modifier silencieusement.

Les ressources de contenu sont distinctes sémantiquement des ressources de Branding,
même si les blobs, crédits et droits peuvent utiliser une infrastructure de stockage
commune et être référencés sans duplication.

## Template et variantes

Champs typés, sources fixes ou liées ; calques indépendants de leurs placements.
Une layout référence un format versionné ; géométrie et ordre de peinture complets.
Références de style `brand:...` résolues dans le snapshot de charte, sinon erreur.
Police locale incorporable requise pour export fidèle ; aucune substitution silencieuse.
Le template déclare toutes les variantes, le support n'en active qu'une sélection.
Validation structurelle distincte de validation graphique (status draft/validated).

### Contrat d'entrée des templates

Chaque template déclare explicitement les contenus qu'il sait consommer. Le contrat
est constitué de slots typés avec cardinalité et champs consommables, par exemple :

- `announcement: 1` ;
- `events: 1..N of core:event@2` ;
- `article: 1` + `relatedEvents: 0..N`.

Le contenu peut exposer davantage de champs que le template n'en utilise. Un template
« prochains concerts » peut ainsi prendre N événements riches et ne lire que date,
ville et label ; un autre template peut consommer les mêmes événements avec description
longue et photographie.

Le moteur vérifie le contrat avant rendu. Un template non satisfaisable par le pool de
contenus de la campagne est non applicable ou en erreur explicite. Aucun template ne
doit deviner implicitement la nature ou la structure d'un contenu.

Les règles de tri, limite, sélection et pagination associées à un slot sont déclaratives
et déterministes. Elles appartiennent au contrat du template/support, pas aux objets
éditoriaux eux-mêmes.

## Campagne et résolution

La campagne référence un **pool de contenus éditoriaux**. Elle n'est pas limitée à une
seule unité de contenu et n'encapsule pas nécessairement les contenus complets : elle
conserve des références/versionnements adaptés à la reproductibilité.

Pour chaque support, le template détermine quels slots doivent être alimentés depuis ce
pool. L'utilisateur peut sélectionner explicitement les contenus affectés à un slot et
leur ordre lorsque le template le permet.

Il n'existe pas d'agrégation générique opaque à interpréter au niveau campagne : la
sémantique de composition provient du contrat du template. Exemple : une campagne
« Saison d'automne » référence quatre concerts ; un support « Story Instagram » utilise
un template `events: 1..N` et sélectionne ces quatre événements.

Pour chaque champ : override du support s'il existe (tester présence, pas vérité),
sinon contenu lié, sinon défaut du template ; champ obligatoire absent = erreur.
Puis sélection d'événements : `all` conserve l'ordre enregistré, `ids` respecte l'ordre
des ids demandés ; id absent ou répété = erreur. Overrides d'une collection autorisés
explicitement seulement, jamais déduits d'un changement de mise en page.

Chaque support embarque son template. Chaque variante active embarque son format.
Charte et assets nécessaires sont embarqués/résolus à l'export ZIP. Des formats
inactifs peuvent rester référencés par le template mais ne sont pas requis au rendu.
Les snapshots sont immuables jusqu'à migration/mise à jour explicite.

Placement overrides : remplacement par propriété ; un frame fourni remplace le frame
entier. Aucun patch récursif implicite. Réinitialiser supprime la propriété override.

## Sélection éditoriale dans l'éditeur

Le modèle doit permettre à l'UI de rechercher et filtrer les contenus sans les charger
comme une simple liste statique : type, période/date, objectif éditorial, statut et texte.
L'ordre explicite d'une sélection de campagne/support doit être persistable.

La compatibilité template/contenus doit pouvoir être calculée à partir des contrats sans
rendre le template. Cette capacité servira au sélecteur pour annoncer qu'un template est
applicable, incomplet ou incompatible.

## Événements et pagination

Collection historique `core:event@1` : id, date civile ISO valide, label et location.
La donnée ne contient aucun rendu localisé. Date présentée avec locale de campagne.
La première version emploie un calque event-list spécialisé et déclaratif.
L'overflow error bloque ; compact respecte les minima puis bloque ; paginate génère
des pages avec calques fixes répétés. Une seule collection paginée par layout en V1.
En-tête et pied répétés, ordre stable, contrôle de chaque page. Un élément plus haut
qu'une page reste une erreur, jamais une boucle de pagination ou une troncature.

La cible `core:event@2` ne change pas ces invariants de déterminisme : le template choisit
les champs qu'il rend et les règles d'overflow restent explicites.

## Persistance et personnalisation

Même modèle de domaine derrière plusieurs adaptateurs : fichier/ZIP, IndexedDB local et
service distant. Le fournisseur reste un adaptateur et ne doit pas dicter les contrats.
Révisions attendues pour save/delete ; null à la création seulement.

La stratégie cible est **local-first** : IndexedDB en première implémentation pour conserver
une application entièrement statique, puis repository distant derrière une API HTTPS.
La cible privilégiée pour le service partagé est PostgreSQL ; JSONB peut compléter les
tables relationnelles là où une extension versionnée le justifie.

Un client web ne se connecte jamais directement à PostgreSQL. Une solution de type
Supabase peut fournir PostgreSQL, API, stockage d'objets et authentification, tout en
restant un adaptateur remplaçable derrière les interfaces du domaine.

Tous les objets persistants utilisateur doivent avoir des identifiants stables, de
préférence UUID, pour permettre synchronisation, migration et export/import ultérieurs.

La galerie partagée est facultative. Personnalisations stockées séparément du catalogue
commun. Export contribution pour revue GitHub, pas d'écriture GitHub depuis le client.

## Hébergement et identité de l'application

Le frontend reste statique et peut être servi par GitHub Pages. L'URL canonique cible est
`studio.flowtherapymusic.com`, afin de découpler l'adresse utilisateur de l'hébergeur et
du backend. Une évolution PWA est compatible avec cette architecture local-first.

## Extensions réservées

Planning éditorial, recommandations de communication, publications avec instantanés,
destinations/capacités et statuts sont des extensions prévues. Les objectifs éditoriaux
et contenus typés doivent permettre ces évolutions sans refonte du modèle.

Pas de secrets sociaux, de fonctions JS ou d'expressions exécutables dans les JSON.
