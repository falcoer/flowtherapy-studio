# Socle Branding et ressources locales — 0.3

Accès par **Branding** ou `#branding`. Une identité locale peut être nommée,
avec couleurs par rôle, trois références de logos et trois rôles typographiques.
Les rôles supplémentaires d’une identité importée sont conservés et éditables.
Les anciennes couleurs `dark*` restent regroupées dans le thème sombre.

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

## Préréglage du site Flow Therapy

La première configuration de couleurs (PR #9) est prolongée par le
[préréglage complet](branding-flowtherapy.md) : palettes claire/sombre, logo
transparent, Bangers pour les titres, Inter pour le corps, Kalam pour les légendes.
Le catalogue unique est `catalog/brands/flowtherapy-website.json` ;
`src/editor/siteBrand.ts` reste une façade compatible, sans seconde copie des couleurs.

Les boutons **Charger Flow Therapy — clair/sombre** chargent un brouillon complet,
avec les fichiers vérifiés et leurs licences. En l’absence d’identité enregistrée,
le brouillon clair est proposé à l’ouverture. Une identité existante est conservée.
Le bouton historique **Charger la charte du site** conserve son usage de rechargement
des couleurs uniquement : il ne remplace pas les logos ou polices déjà associés.
Ces substitutions sont confirmées, puis enregistrées et appliquées explicitement.

Les fichiers du préréglage sont préparés avant dev/build à partir d’un commit figé
du dépôt du site. Les provenances, empreintes et licences sont conservées. Aucune
requête à GitHub ou Google Fonts n’est effectuée par le navigateur. L’import manuel
reste disponible pour les autres fichiers, avec leurs droits d’utilisation.

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

Le format de campagne et d'identité est v2 : `Brand.logos` et `Asset.credit` sont
facultatifs mais font partie du contrat versionné. Les campagnes v1 sont migrées
explicitement vers v2 avant validation, export JSON/ZIP ou sauvegarde IndexedDB ; les
anciennes versions du studio ne doivent pas importer ces documents v2. Le ZIP STORE
reste inchangé. Le préréglage n’introduit pas de nouveau schéma ni de migration.

## Limites explicites

- Une seule identité locale éditable ; les préréglages claire/sombre sont des copies,
  pas encore une gestion de palettes multiples dans un même document.
- La liste des ressources expose nom, type, crédit et droits ; édition des
  métadonnées, suppression, recherche et miniatures restent à venir.
- L'Éditorial partagé et les tiroirs Médias complets restent à construire.
- Les couleurs, logos et polices sont associés, sauvegardés et visibles dans le
  spécimen de Branding. Leur rendu automatique par les templates, les zones de
  protection, tailles minimales et variantes appartiennent aux prochaines tranches.
- Les aperçus de campagne restent provisoires avec polices système ; aucun SVG,
  export PNG/JPEG/PDF ou serveur Supabase livré ici.
- Le ZIP d'identité ne sauvegarde que les ressources qui lui sont associées.
  La sauvegarde intégrale du catalogue de ressources reste à venir.

## Vérification

`npm run check` et `npm run test:e2e` couvrent la migration v1, la déduplication,
les conflits et écritures atomiques, l'isolation des instantanés, JSON/ZIP,
l'application d'identité, l'insertion d'une ressource existante et le mobile.
Les tests du préréglage complètent ces parcours : provenance, rôles, chargement
réel des fichiers, absence de requêtes externes et protection des identités existantes.
