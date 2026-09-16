# Bibliothèque — index de ressources et contenus

La Bibliothèque est la seconde projection du nouveau shell **Marque / Bibliothèque / Campagnes / Publications**.

Elle ne crée pas un nouveau stockage. Les octets restent dans le catalogue de ressources content-addressed existant, dédupliqué par SHA-256. Les documents éditoriaux et les campagnes conservent leurs instantanés. Bibliothèque construit au-dessus de ces données une vue métier commune.

## Responsabilités

- rechercher les ressources par nom, crédit, droits et usages ;
- distinguer images, polices et autres types ;
- afficher la fiche canonique d'une ressource ;
- calculer les usages connus dans les releases de marque, campagnes et contenus ;
- conserver la distinction entre ressource canonique et instantanés consommateurs ;
- donner accès aux outils existants d'import, sauvegarde et édition de métadonnées sans dupliquer les fichiers ;
- réunir progressivement ressources et contenus éditoriaux sous un même espace.

## Identité et rapprochement

Les instantanés peuvent employer un identifiant local différent de celui de la ressource canonique. Le rapprochement est donc effectué par **SHA-256** pour les campagnes et contenus.

Les objets `font-role` et `logo` d'une release de marque référencent un `assetId` stable. Leurs usages sont rattachés à la ressource canonique par cet identifiant et conservent le numéro de release concerné.

Ainsi, retirer une police ou un logo d'une nouvelle release ne supprime pas la trace de son utilisation dans une release historique.

## Interface de la première tranche

La vue Ressources suit la même structure que Marque :

1. catalogue filtrable à gauche ;
2. fiche de la ressource au centre ;
3. usages et dépendances à droite.

La fiche expose source, MIME, crédit, droits, chemin logique et empreinte. Le panneau d'usages sépare Marque, Campagnes et Contenus.

L'onglet **Contenus** réutilise l'éditeur éditorial actuel. L'outil **Gérer fichiers et métadonnées** réutilise temporairement la médiathèque existante pour l'import, l'édition et les sauvegardes ZIP. Ces deux réutilisations sont intentionnelles : elles évitent une seconde implémentation pendant la migration du shell.

## Invariants

- un fichier identique n'est stocké qu'une fois ;
- la Bibliothèque ne modifie jamais silencieusement un instantané ;
- modifier les métadonnées canoniques ne réécrit pas les campagnes ou contenus historiques ;
- un usage affiché doit être dérivable des documents persistés ou de la campagne courante ;
- une ressource absente du catalogue canonique n'est pas inventée par l'index ;
- la vue reste reconstruisible à partir des données existantes.

## Suite

La tranche suivante pourra promouvoir Bibliothèque au niveau du shell global, absorber l'ancien accès Éditorial/Médias, puis préparer **Publications**. Les futurs types audio, vidéo, PDF et SVG pourront enrichir le catalogue sans changer ce principe d'indexation.
