# Socle Branding et ressources locales — 0.3

Accès par **Branding** ou `#branding`. Une identité locale peut être nommée,
avec quatre couleurs par rôle (fond, texte, accent, contraste), trois références
de logos et trois rôles typographiques. Les champs supplémentaires d'une identité
importée sont conservés ; leur édition avancée reste à venir.

## Parcours

1. Importer des PNG/JPEG ou polices WOFF/WOFF2/TTF/OTF avec leurs droits et,
   facultativement, leur crédit. Les fichiers identiques réutilisent la ressource
   déjà connue, y compris sa provenance, ses crédits et ses droits.
2. Associer ces ressources aux rôles de logo ou de typographie.
3. Enregistrer l'identité, puis **Appliquer à la campagne** pour copier sa révision
   exacte et ses références. L'application est annulable dans l'historique de la
   campagne ; enregistrer ensuite cette campagne.
4. Dans un support : **Parcourir les ressources**, choisir une image et **Utiliser
   cette image**. Chaque insertion crée un calque et un recadrage indépendants.
   L'import d'image historique alimente aussi le catalogue commun.
5. Exporter l'identité ZIP pour sauvegarder ses réglages et ses fichiers associés ;
   l'import prépare son remplacement local, effectif à l'enregistrement. Les ZIP
   de campagne continuent d'inclure tous les fichiers référencés.

L'identité du référentiel et l'instantané d'une campagne sont distincts. Modifier
le référentiel ne modifie pas les campagnes existantes. Une application explicite
actualise aussi les références de révision de ses templates liés à cette identité.
Les références manquantes ou collisions d'identifiants sont refusées sans écrasement.
Un conflit entre onglets refuse l'enregistrement ; recharger l'identité enregistrée
ou exporter le brouillon avant de le recharger.

## Stockage et migration

IndexedDB passe de version 1 à 2 dans une transaction de migration. Les documents
et leurs révisions sont conservés. Les anciens fichiers sont déplacés vers `blobs`,
indexés par SHA-256 ; les documents ne stockent plus leurs octets, mais un index
chemin → empreinte. `resources` conserve les métadonnées communes, `brands` l'identité
locale et `campaigns` les campagnes. Un fichier est stocké une seule fois, même si
plusieurs campagnes l'utilisent. Les fichiers absents d'un ancien import JSON
restent explicitement absents.

Les écritures document/index/fichiers restent atomiques et contrôlent la révision
attendue. Les signatures, types, tailles et SHA-256 des nouveaux fichiers sont
validés avant transaction. Les métadonnées sont également conservées dans les
instantanés pour des sauvegardes reproductibles. Supprimer une campagne ne supprime
pas une ressource partagée. Aucune purge automatique n'est introduite.

Le format de campagne reste v1 : `Brand.logos` et `Asset.credit` sont facultatifs.
Tous les anciens documents restent acceptés par cette version du studio. Les
anciennes versions du studio, strictes sur les propriétés, ne peuvent pas importer
les documents contenant ces nouveaux champs. Le ZIP STORE reste inchangé.

## Limites explicites

- Une seule identité locale éditable, une palette avec quatre rôles exposés.
- La liste des ressources expose nom, type, crédit et droits ; édition des
  métadonnées, suppression, recherche et miniatures restent à venir.
- L'Éditorial partagé et les tiroirs Médias complets restent à construire.
- Les couleurs, logos et polices sont associés et sauvegardés. Leur rendu automatique
  par les templates, les zones de protection, tailles minimales, associations de
  palettes et variantes typographiques appartiennent aux prochaines tranches.
- Les aperçus restent provisoires avec polices système ; aucun SVG, export
  PNG/JPEG/PDF ou serveur Supabase livré ici.
- Le ZIP d'identité ne sauvegarde que les ressources qui lui sont associées.
  La sauvegarde intégrale du catalogue de ressources reste à venir.

## Vérification

`npm run check` et `npm run test:e2e` couvrent la migration v1, la déduplication,
les conflits et écritures atomiques, l'isolation des instantanés, JSON/ZIP,
l'application d'identité, l'insertion d'une ressource existante et le mobile.
