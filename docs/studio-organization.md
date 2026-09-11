# Organisation du studio — décisions validées

Décisions validées avec le propriétaire le 11 septembre 2026.
Ce document remplace l'organisation initiale à trois tiroirs et le nom provisoire
« Moyens ». La navigation cible est : **Branding / Éditorial / Médias / Campagnes**.
Ces choix sont pérennisés ; ils ne signifient pas que tous les écrans sont livrés.

## Parcours de travail

L'interface doit présenter ces quatre domaines comme un parcours cohérent de
communication, sans imposer qu'ils soient tous recréés à chaque campagne :

1. **Branding** : définit la marque de référence. Le studio est volontairement
   mono-marque dans sa première architecture ; les campagnes héritent de cette identité.
2. **Éditorial** : prépare la matière à communiquer indépendamment de sa diffusion.
3. **Médias** : configure les moyens réutilisables de rendu et de diffusion
   (formats, templates, canaux et destinations).
4. **Campagnes** : sélectionne des contenus existants, leur applique une direction
   créative, des templates, des formats et des destinations, puis orchestre la production.

Branding et Médias sont donc principalement des espaces de configuration durable.
Dans une campagne, ils sont hérités puis éventuellement ajustés par des exceptions
explicites plutôt que ressaisis depuis zéro.

## 1. Branding

### Identité de marque

- Description : positionnement, mission, promesse, valeurs, publics.
- Historique : étapes de la marque, distinctes de l'historique technique des versions.
- Intervenants : personnes, rôles, crédits et responsabilités.
- Voix de marque : ton, vocabulaire, formulations à privilégier ou éviter,
  exemples par contexte.

Le studio cible d'abord **une seule marque configurée globalement**. Il n'expose pas
un catalogue de marques. Une éventuelle gestion multi-marques relèverait d'une évolution
ultérieure du produit et ne doit pas compliquer le modèle initial.

### Identité visuelle

| Ressource | Informations et règles |
|---|---|
| Logos | Variantes, fonds compatibles, zone de protection, taille minimale, version principale |
| Photos | Sujet, crédit, droits d'utilisation, point focal, recadrages autorisés |
| Illustrations, icônes, ornements | Famille graphique, couleurs autorisées, recoloration et composition |
| Palettes | Rôles fond/texte/accent/contraste, associations autorisées |
| Polices | Fichiers, graisses, rôles typographiques, polices de remplacement |
| Composants | Structure, paramètres, contenu attendu, variantes, contraintes |
| Mises en page | Zones, hiérarchie, formats compatibles, règles d'adaptation |

Les mises en page expriment la grammaire visuelle de la marque ; les templates
les mobilisent pour une intention de communication. Droits, versions et statuts
brouillon/validé/remplacé sont transversaux.

## 2. Éditorial

Ce tiroir réunit la matière à communiquer et ses ressources associées :

- Vue d'ensemble : contenus et ressources, filtrables par type, thème, date et statut.
- Contenus : événements, articles, annonces et présentations.
- Médiathèque : photos, vidéos, audio et documents liés aux contenus.
- Ligne éditoriale : objectifs, publics, thèmes, rythme et adaptation du ton par canal.
- Planning éditorial : évolution future permettant de suivre la régularité de présence
  et de proposer des actions ou campagnes à partir des objectifs et contenus disponibles.

« Ligne éditoriale » devient une sous-section, pas le nom du tiroir.
Formats, templates et canaux appartiennent à Médias.

### Objectifs éditoriaux

Les objectifs éditoriaux sont des objets stables et réutilisables plutôt que de simples
mots-clés libres. Ils servent à classer et retrouver les contenus, à cadrer les campagnes
et, à terme, à alimenter des suggestions automatiques de publication ou de campagne.
Un contenu peut être associé à un ou plusieurs objectifs.

### Contenus éditoriaux typés

Un contenu éditorial est une unité autonome, persistée indépendamment des campagnes.
Il peut notamment porter :

- un type ou une nature (`event`, `article`, `announcement`, etc.) ;
- une date ou période pertinente ;
- un titre ;
- un texte court et/ou développé ;
- des métadonnées propres à son type ;
- des objectifs éditoriaux ;
- un statut (`draft`, `validated`, `ready`, `archived`, à préciser) ;
- des références vers des assets de contenu.

Les assets de contenu (photo d'un lieu, vidéo, document, audio...) sont distincts
sémantiquement des assets de Branding, même si le stockage physique des ressources
reste mutualisé. Une photo de marque stable et une photographie ponctuelle d'un lieu
n'ont pas le même rôle métier.

L'utilisateur peut travailler par sujet : ouvrir un événement donne accès à ses
informations, ressources associées et campagnes utilisatrices. Ce mélange dans
l'interface conserve des objets distincts dans le modèle.

### Événement riche

Un événement, notamment un concert, doit pouvoir être décrit comme un contenu complet :
identifiant, date/heure, label ou titre, lieu, ville, description courte, description
longue et ressources associées (par exemple une photographie du lieu ou de l'organisateur).
Il n'est pas réduit à une ligne d'agenda.

Cette richesse permet à plusieurs templates de consommer **le même événement** avec
des niveaux de détail différents : une story peut n'afficher que date et ville, alors
qu'un support éditorial détaillé peut afficher description et photographie.

### Ressources partagées sans duplication

Les fichiers, crédits et droits sont centralisés. Branding, contenus éditoriaux
et campagnes référencent les mêmes ressources. Une photo officielle peut donc
figurer dans l'identité visuelle, accompagner un article et servir plusieurs campagnes
sans duplication de son fichier. Les usages et recadrages locaux restent distincts.
La médiathèque est une vue de ces ressources, pas un silo de stockage supplémentaire.

## 3. Médias

Médias regroupe les moyens transversaux : **formats, templates et canaux**.
Ce tiroir est à côté du Branding ; il n'en est ni un parent ni un sous-ensemble.
Le nom Médias ne désigne pas ici la collection de fichiers photo/vidéo de la médiathèque.

| Objet | Rôle | Relation à la marque |
|---|---|---|
| Format | Dimensions, ratio, unités, zones de sécurité et contraintes de sortie | Généralement indépendant de la marque |
| Template | Intention, contrat de contenus attendu, composants, composition et variantes par format | Générique ou lié à une identité |
| Canal | Destination et contraintes de communication | Configuration de destinations propres à la marque |

Canaux envisagés : réseaux sociaux, site, mailing, impression, téléphone.
Instagram est un canal ; le compte Flow Therapy est une destination configurée.
Le téléphone peut utiliser un script textuel : tous les supports ne sont pas graphiques.
Les secrets d'accès restent hors des documents client ; connecteurs futurs.

Médias est une configuration réutilisable d'une campagne à l'autre. Dans une campagne,
l'utilisateur confirme ou ajuste les paramètres hérités ; l'interface doit privilégier
le modèle **héritage par défaut + exceptions explicites** plutôt qu'une ressaisie complète.

### Contrat d'entrée d'un template

Un template ne reçoit pas un document générique à interpréter librement. Il déclare
explicitement les contenus dont il a besoin sous forme de slots typés et de cardinalités.
Exemples :

- un template « annonce » peut exiger `1 announcement` ;
- un template « agenda » peut exiger `1..N event` ;
- un template éditorial peut demander `1 article` et `0..N event` associés.

Chaque slot précise les champs qu'il sait consommer. Les champs disponibles dans le
contenu peuvent être plus riches que ceux effectivement rendus.

Le moteur vérifie l'applicabilité : un template n'est sélectionnable ou rendable que
si la campagne dispose de contenus compatibles avec son contrat. Le template peut
ensuite appliquer des règles déterministes de tri, sélection, limite et pagination.
Ces règles appartiennent au contrat/template ; elles ne doivent pas être devinées à
partir du contenu.

Cas central validé : un **seul template** « prochains concerts » reçoit N contenus
`event` de type concert. Il peut produire une story Instagram montrant quatre dates et
villes à partir des quatre mêmes objets événement utilisés ailleurs avec davantage de détail.

## 4. Campagnes

Une campagne assemble des contenus, une identité, une direction créative et des
médias pour atteindre un objectif :

- Brief : objectif, public, message et période.
- Contenus : sélection d'événements/articles dans la bibliothèque éditoriale.
- Supports : activation de templates dans des formats pour les canaux choisis.
- Direction créative : laboratoire et ajustements de direction.
- Planification : calendrier et états des actions prévues.
- Production : aperçu, validation et exports ; publication et suivi ultérieurs.

Une campagne n'est **pas limitée à un contenu unique**. Elle constitue un pool de
contenus éditoriaux sélectionnés. Les templates utilisés par ses supports déclarent
ensuite quels contenus de ce pool ils consomment et selon quelle cardinalité.

Il n'est donc pas nécessaire d'introduire une agrégation générique opaque au niveau
de la campagne : la sémantique d'agrégation est portée par le contrat d'entrée du
template. La campagne conserve toutefois la sélection, l'ordre utilisateur lorsqu'il
est pertinent et les éventuels choix explicites de contenus affectés à un support.

### Sélection des contenus dans l'interface

La sélection ne doit pas se limiter à une longue liste de cases à cocher.
Le pattern cible est un **sélecteur de contenus** :

- recherche plein texte ;
- filtres par type, date/période, objectif éditorial et statut ;
- tri, notamment événements à venir par date croissante ;
- liste des contenus déjà retenus dans la campagne ;
- sélection multiple rapide ;
- indication de compatibilité avec les templates disponibles.

Exemple : l'utilisateur filtre `event / concert / à venir`, sélectionne les quatre
prochains concerts puis choisit un template déclarant `1..N event`. Le studio peut
indiquer immédiatement que le contrat est satisfait.

Un support est une production de campagne. Exemple :
campagne « Saison d'automne » → support « Story Instagram » →
template « Prochains concerts » → format story → quatre événements sélectionnés →
direction créative de campagne.

## Direction créative : modèle retenu

Le laboratoire est **l'interface d'édition de la Direction créative d'une campagne**.
Il n'est pas un espace métier autonome. Accès cible : Campagnes > campagne >
Direction créative.

| Axe | Réglage | Effets attendus |
|---|---|---|
| Énergie | Calme → Explosive | Inclinaison, contraste des tailles, rythme des espacements, intensité des ornements |
| Expression colorée | Sobre → Vibrante | Étendue de palette utilisée, saturation dans les limites autorisées, place des accents |
| Échelle graphique | Délicate → Monumentale | Taille relative du titre, de la photo et du symbole principal |
| Densité | Aérée → Compacte | Espacement, détails affichés et nombre de blocs selon des règles explicites |
| Dominante | Image / Texte / Équilibrée | Répartition de l'espace et priorité visuelle |

Choix de palette et expression colorée sont distincts. Les éléments obligatoires
restent présents ; la densité ne supprime ni ne tronque arbitrairement du contenu.
La dominante Image suppose une ressource disponible ; les capacités du template
doivent être explicites.

La campagne porte et sauvegarde ses cinq axes. Ses supports en héritent, avec des
ajustements locaux explicites et réinitialisables. Une recette est un préréglage
réutilisable, copié vers la direction d'une campagne ; sa modification ne doit pas
altérer silencieusement les campagnes existantes.
La direction doit survivre à l'enregistrement, la réouverture et aux échanges JSON/ZIP.
Références, snapshots et versions doivent préserver la reproductibilité.

## Persistance et hébergement cible

Le modèle de domaine doit rester indépendant de la technologie de persistance.
Le studio suit une stratégie **local-first** :

1. application statique hébergée sur GitHub Pages ;
2. repository local basé sur IndexedDB pour données et ressources ;
3. même contrat de repository pouvant ultérieurement cibler une API distante ;
4. base distante privilégiée : PostgreSQL, avec JSONB si nécessaire pour certaines
   extensions de documents ;
5. accès depuis le navigateur exclusivement via une API sécurisée, jamais par une
   connexion PostgreSQL directe.

Supabase constitue une option cible crédible pour fournir PostgreSQL, API, stockage et
authentification sans remettre en cause le frontend statique. Ce choix reste un adaptateur
et ne doit pas contaminer le modèle de domaine.

Les objets persistants doivent disposer d'identifiants stables, idéalement UUID, afin
de permettre export/import, migration et synchronisation locale/distante ultérieure.
Les données historiques ne doivent pas être purgées simplement pour générer de l'activité ;
les tâches planifiées futures doivent correspondre à de vrais besoins de maintenance.

L'URL canonique cible de l'application est **studio.flowtherapymusic.com**. Le sous-domaine
peut pointer aujourd'hui vers GitHub Pages et rester stable si l'hébergement ou le backend
évoluent. L'application pourra ensuite être rendue installable sous forme de PWA sans
abandonner son architecture statique/local-first.

## État réel et prochaine étape

Le noyau 0.1, l'éditeur 0.2 et le prototype de laboratoire sont intégrés sur main.
La PR #4 a été fusionnée et publiée sur GitHub Pages le 11 septembre 2026.

Disponible : campagne locale, laboratoire énergie/densité/échelle, harmonies,
recettes séparées en localStorage et aperçu multiformat.
Non livré : tiroirs complets, ressources centralisées, contenus éditoriaux partagés,
expression colorée, dominante, direction persistée dans la campagne, héritage vers
les supports, application aux templates de production et exports graphiques.

Le rendu du studio et des médias est provisoire : palettes exploratoires,
polices système et compositions de prototype. Les interactions validées ne figent
pas la finition graphique. Celle-ci s'appuiera sur l'identité et des templates
travaillés par format.

Priorité : aligner modèle, persistance et navigation sur ces décisions, compléter
les cinq axes et vérifier leur application à deux supports de formats différents.
Voir [prochaine étape](next-step.md) et [limites du laboratoire actuel](creative-lab.md).
