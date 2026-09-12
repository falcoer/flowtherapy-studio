# ADR 0003 — Éditorial local, ressources partagées et instantanés de campagne

Statut : accepté le 12 septembre 2026 ; implémenté au jalon 0.3 (`0.3.0-alpha.3`).

## Contexte

Le studio doit permettre de préparer la matière éditoriale indépendamment des campagnes,
de réutiliser les mêmes ressources visuelles sans duplication, puis d'employer ces
contenus dans plusieurs supports sans qu'une modification ultérieure du contenu source
altère silencieusement une campagne existante.

L'organisation métier reste **Branding / Éditorial / Médias / Campagnes**. Éditorial
contient les contenus et leur médiathèque ; Médias contient formats, templates et canaux.
La médiathèque n'est pas un silo de fichiers distinct du Branding ou des campagnes.

## Décision

### Contenus éditoriaux autonomes

- Les articles, annonces, présentations et événements sont des documents éditoriaux
  autonomes, versionnés et persistés indépendamment des campagnes.
- Un contenu porte au minimum son type, son titre, son résumé, son corps, ses thèmes et
  son statut ; un événement ajoute sa date civile et son lieu.
- Les statuts sont **Brouillon**, **Prêt** et **Archivé**. `Prêt` ne signifie ni publié
  ni planifié pour publication.
- Le corps conserve sa source complète. La première édition utilise un sous-ensemble
  Markdown ; aucun HTML arbitraire n'est interprété.

### Ressources communes et insérables

- Une ressource est un fichier référencé par son empreinte et ses métadonnées de
  provenance, droits et crédit.
- Les octets identiques sont dédupliqués. Branding, Éditorial et Campagnes peuvent
  référencer la même ressource sans copier le fichier.
- Une ressource et son usage sont distincts : placement, recadrage, visibilité ou
  association à un contenu restent locaux à l'usage.
- Les images PNG/JPEG sont insérables comme calques de support. Les polices sont des
  ressources utilisées par rôle typographique, pas des calques.
- SVG, audio, vidéo et PDF restent hors périmètre tant que leurs contrats de validation
  et de rendu ne sont pas définis.

### Campagnes reproductibles par instantanés

- Sélectionner un contenu dans une campagne copie un **instantané identifié par sa
  révision**. La campagne ne dépend jamais d'une lecture mutable du catalogue éditorial
  pour son rendu.
- Réécrire un article ne modifie donc pas une campagne existante. Une future mise à
  jour d'instantané devra être explicite et comparer les révisions.
- Les champs d'un support sont reliés explicitement aux champs compatibles des contenus
  sélectionnés. Le texte n'est pas ressaisi ni dupliqué arbitrairement dans le document.
- Les événements éditoriaux forment une collection ordonnée. Ils ne remplacent ni ne
  fusionnent silencieusement une liste d'événements saisie manuellement.
- Un contenu encore référencé par un support ne peut pas être retiré sans traiter ses
  liaisons.

### Local-first et échanges

- IndexedDB demeure le stockage actif du studio local. La persistance distante reste un
  adaptateur futur, conformément à l'ADR 0002.
- Les contenus éditoriaux et ressources disposent de sauvegardes ZIP ; les campagnes
  continuent à transporter leurs instantanés et fichiers nécessaires.
- Les restaurations créent de nouveaux documents locaux plutôt que d'écraser
  implicitement une version existante.
- Les conflits de révision sont détectés et ne doivent jamais résoudre une concurrence
  par dernier-écrivain silencieux.

### Versionnement

- `EditorialDocument` est introduit comme contrat versionné.
- `Campaign` passe explicitement en version 3 pour porter les instantanés éditoriaux.
- IndexedDB passe en version 3 avec migrations explicites depuis les versions 1 et 2.
- `Brand` reste v2 ; `Template` et `Format` restent v1 ; l'archive ZIP STORE reste v1.
- Les migrations opèrent sur copie et ne fabriquent pas de sélection éditoriale absente.

## Conséquences

La rédaction et la médiathèque peuvent évoluer sans imposer de service cloud. Une
campagne demeure reproductible même si l'article source ou ses métadonnées sont ensuite
modifiés. Le modèle permet également d'utiliser une même photo dans l'identité visuelle,
un article et plusieurs supports tout en conservant des usages indépendants.

Le rendu de composition est encore principalement textuel : le Markdown source est
préservé, mais les calques texte n'en rendent pas toute la richesse. Les articles longs
ne sont pas encore paginés. L'éditeur WYSIWYG, la Ligne éditoriale éditable, la
suppression contrôlée des ressources, l'actualisation comparée des instantanés et la
persistance partagée restent des évolutions séparées.

## Suite retenue

La priorité graphique suivante est le template **concert illustré multiformat** guidé
par l'affiche de référence du 11 septembre 2026. Le tiroir Médias devra ensuite exposer
plus complètement formats, templates et canaux. Les exports PNG/JPEG/PDF restent au
jalon 0.4 et devront consommer la scène résolue plutôt que recalculer la mise en page.
