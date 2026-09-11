# Archive campagne v1

ZIP standard, entrées STORE (méthode 0, sans compression), sans chiffrement,
commentaires, data descriptors, liens symboliques, ZIP64 ni volumes multiples.
Le format volontairement limité permet de contrôler les tailles et limites avant
lecture des contenus, sans décompression de données non fiables. Un ZIP compressé
par un autre logiciel est refusé explicitement. Les fichiers produits sont lisibles
avec les outils ZIP usuels. L'export fixe les dates des entrées pour être déterministe.

Contenu exact :

- `campaign.json` : document campagne v1 UTF-8.
- `manifest.json` : `{ archiveVersion: 1, files: [...] }`.
- `assets/...` : un fichier par asset déclaré, aucun fichier supplémentaire.

Chaque élément de `files` contient `path`, `size` (octets), `sha256` (hexadécimal
minuscule) et `mimeType`. Il couvre la campagne et tous les assets, mais pas le
manifeste lui-même. Le hash des assets doit aussi correspondre au document.
Ces sommes détectent les corruptions ; elles n'authentifient pas l'auteur du ZIP.

Limites : archive 64 MiB, une entrée 32 MiB, JSON 2 MiB, 256 entrées au total.
Les chemins d'assets utilisent ASCII alphanumérique, `_`, `-`, `.`, `/`, sous
`assets/`, sans segment vide, `.` ou `..`. Les doublons et les divergences entre
en-têtes ZIP locaux et centraux sont rejetés. Le lecteur contrôle aussi les CRC32,
l'inventaire exact et les sommes SHA-256, avant de retourner des données importées.
Aucune extraction sur disque, requête réseau ou écriture en persistance à l'import.

Types binaires acceptés : PNG, JPEG, TTF, OTF, WOFF et WOFF2, avec contrôle de
signature. Ce contrôle n'est pas un décodage complet du média ; le futur moteur
validera aussi les dimensions et la capacité de décodage avec ses propres limites.
SVG, HTML et les autres types sont refusés dans le ZIP v1. Le support de SVG exigera
un nettoyage dédié avant rendu ; il n'est pas simulé par une liste de mots interdits.
Les métadonnées JSON seules peuvent décrire d'autres MIME, sans les charger.

L'import/export exige les octets de tous les assets déclarés, même inutilisés,
pour préserver l'ensemble de la campagne sans perte. Les formats inactifs référencés
par un template restent de simples références, sans dépendance au catalogue externe.
