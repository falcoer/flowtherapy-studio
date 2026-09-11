# Organisation du studio — décisions validées

Décisions validées avec le propriétaire le 11 septembre 2026.
Ce document remplace l'organisation initiale à trois tiroirs et le nom provisoire
« Moyens ». La navigation cible est : **Branding / Éditorial / Médias / Campagnes**.
Ces choix sont pérennisés ; ils ne signifient pas que tous les écrans sont livrés.

## 1. Branding

### Identité de marque

- Description : positionnement, mission, promesse, valeurs, publics.
- Historique : étapes de la marque, distinctes de l'historique technique des versions.
- Intervenants : personnes, rôles, crédits et responsabilités.
- Voix de marque : ton, vocabulaire, formulations à privilégier ou éviter,
  exemples par contexte.

### Identité visuelle

| Ressource                        | Informations et règles                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| Logos                            | Variantes, fonds compatibles, zone de protection, taille minimale, version principale |
| Photos                           | Sujet, crédit, droits d'utilisation, point focal, recadrages autorisés                |
| Illustrations, icônes, ornements | Famille graphique, couleurs autorisées, recoloration et composition                   |
| Palettes                         | Rôles fond/texte/accent/contraste, associations autorisées                            |
| Polices                          | Fichiers, graisses, rôles typographiques, polices de remplacement                     |
| Composants                       | Structure, paramètres, contenu attendu, variantes, contraintes                        |
| Mises en page                    | Zones, hiérarchie, formats compatibles, règles d'adaptation                           |

Les mises en page expriment la grammaire visuelle de la marque ; les templates
les mobilisent pour une intention de communication. Droits, versions et statuts
brouillon/validé/remplacé sont transversaux.

## 2. Éditorial

Ce tiroir réunit la matière à communiquer et ses ressources associées :

- Vue d'ensemble : contenus et ressources, filtrables par type, thème, date et statut.
- Contenus : événements, articles, annonces et présentations.
- Médiathèque : photos, vidéos, audio et documents liés aux contenus.
- Ligne éditoriale : objectifs, publics, thèmes, rythme et adaptation du ton par canal.

« Ligne éditoriale » devient une sous-section, pas le nom du tiroir.
Formats, templates et canaux appartiennent à Médias.

L'utilisateur peut travailler par sujet : ouvrir un événement donne accès à ses
informations, ressources associées et campagnes utilisatrices. Ce mélange dans
l'interface conserve des objets distincts dans le modèle.

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

| Objet    | Rôle                                                                        | Relation à la marque                              |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------- |
| Format   | Dimensions, ratio, unités, zones de sécurité et contraintes de sortie       | Généralement indépendant de la marque             |
| Template | Intention, champs attendus, composants, composition et variantes par format | Générique ou lié à une identité                   |
| Canal    | Destination et contraintes de communication                                 | Configuration de destinations propres à la marque |

Canaux envisagés : réseaux sociaux, site, mailing, impression, téléphone.
Instagram est un canal ; le compte Flow Therapy est une destination configurée.
Le téléphone peut utiliser un script textuel : tous les supports ne sont pas graphiques.
Les secrets d'accès restent hors des documents client ; connecteurs futurs.

## 4. Campagnes

Une campagne assemble des contenus, une identité, une direction créative et des
médias pour atteindre un objectif :

- Brief : objectif, public, message et période.
- Contenus : sélection d'événements/articles et ordre de présentation.
- Supports : activation de templates dans des formats pour les canaux choisis.
- Direction créative : laboratoire et ajustements de direction.
- Planification : calendrier et états des actions prévues.
- Production : aperçu, validation et exports ; publication et suivi ultérieurs.

Un support est une production de campagne. Exemple fictif :
campagne « Saison d'automne » → support « Publication Instagram » →
template « Agenda » → format carré → trois événements sélectionnés →
direction créative de campagne.

## Direction créative : modèle retenu

Le laboratoire est **l'interface d'édition de la Direction créative d'une campagne**.
Il n'est pas un espace métier autonome. Accès cible : Campagnes > campagne >
Direction créative.

| Axe                | Réglage                    | Effets attendus                                                                        |
| ------------------ | -------------------------- | -------------------------------------------------------------------------------------- |
| Énergie            | Calme → Explosive          | Inclinaison, contraste des tailles, rythme des espacements, intensité des ornements    |
| Expression colorée | Sobre → Vibrante           | Étendue de palette utilisée, saturation dans les limites autorisées, place des accents |
| Échelle graphique  | Délicate → Monumentale     | Taille relative du titre, de la photo et du symbole principal                          |
| Densité            | Aérée → Compacte           | Espacement, détails affichés et nombre de blocs selon des règles explicites            |
| Dominante          | Image / Texte / Équilibrée | Répartition de l'espace et priorité visuelle                                           |

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

## État réel et prochaine étape

Le noyau 0.1, l'éditeur 0.2 et le prototype de laboratoire sont intégrés sur main.
La PR #4 a été fusionnée et publiée sur GitHub Pages le 11 septembre 2026.

Disponible : campagne locale, cinq axes de direction persistés, harmonies, recettes
v2 avec migration v1, héritage et ajustements de support réinitialisables, ressource
image de direction et aperçu multiformat.
Non livré : tiroirs complets, ressources centralisées, contenus éditoriaux partagés,
scène graphique commune, templates de production et exports graphiques.

Le rendu du studio et des médias est provisoire : palettes exploratoires,
polices système et compositions de prototype. Les interactions validées ne figent
pas la finition graphique. Celle-ci s'appuiera sur l'identité et des templates
travaillés par format.

Priorité : construire le socle Branding et les ressources centralisées, puis relier
le catalogue de Médias et la scène résolue aux directions déjà persistées.
Voir [prochaine étape](next-step.md) et [limites du laboratoire actuel](creative-lab.md).
