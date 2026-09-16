# ADR 0004 — Le branding devient une configuration de marque versionnée

- Statut : accepté
- Date : 2026-09-16
- Décideur : propriétaire de Flow Therapy Studio

## Contexte

Le socle actuel sait enregistrer une identité locale, centraliser ses ressources et
copier un instantané de cette identité dans une campagne. Cette base protège déjà
les campagnes contre les modifications silencieuses.

L'interface et le modèle restent toutefois organisés comme un ensemble de rubriques
Branding, Éditorial et Médias. Une charte ou un document libre serait simple à lire,
mais trop facile à modifier sans identifier les conséquences sur les composants,
templates, campagnes et productions.

Le besoin est de conserver une expérience visuelle tout en faisant des données
structurées, des règles et de leurs dépendances la source de vérité.

## Décision

Flow Therapy Studio devient progressivement un **système de gestion de configuration
de marque**.

### Source de vérité

La source de vérité est un graphe d'objets typés et versionnés :

- objets de marque : couleurs, typographies, logos, principes, composants et règles ;
- relations explicites entre objets ;
- ressources binaires référencées, jamais dupliquées ;
- lots de changements ;
- versions publiées et immuables ;
- instantanés de campagne rattachés à une version publiée.

La charte lisible, les catalogues visuels et les rapports sont des projections
générées depuis ce modèle. Ils ne constituent pas un canal d'édition parallèle.

### Modification transactionnelle

Une modification est préparée dans un brouillon et rejoint un lot de changements.
Avant publication, le système calcule les dépendances, contrôles et migrations
nécessaires. Une publication produit une nouvelle version immuable.

Aucun changement publié ne modifie silencieusement une campagne ou une production
existante. La migration vers une nouvelle version est explicite.

### Organisation cible

La navigation principale devient :

1. **Marque** — configuration, règles, versions et guide généré ;
2. **Bibliothèque** — ressources et contenus structurés ;
3. **Campagnes** — brief, contenus, direction, productions ;
4. **Publications** — validations, exports et diffusion.

Formats, templates, canaux, palettes et polices sont des objets ou capacités
contextuels ; ils ne justifient pas seuls un espace principal.

### Interaction

Le shell applicatif reste stable : navigation à gauche, espace de travail central,
inspecteur contextuel à droite et état de version visible. Une fiche d'objet expose
sa définition, ses règles, ses aperçus, ses usages et son historique.

## Invariants

- une version publiée est immuable ;
- une campagne référence une version ou un instantané déterminé ;
- une ressource partagée reste adressée par son identité et son empreinte ;
- toute propagation est explicite et traçable ;
- une règle peut produire une information, un avertissement ou un blocage ;
- une vue documentaire ne peut pas contourner le modèle structuré ;
- les imports historiques conservent identifiants, droits, crédits et provenance.

## Transition

L'évolution est incrémentale et ne constitue pas une réécriture. Le modèle Brand v2
est importé comme première configuration structurée. Les campagnes existantes
conservent leur instantané. Le premier incrément vertical porte sur une couleur :

1. modifier un jeton de couleur dans un brouillon ;
2. analyser ses dépendances ;
3. publier une nouvelle version ;
4. conserver une campagne existante sur son instantané ;
5. proposer sa migration explicite.

Le détail du modèle et de la migration est décrit dans
[Brand Configuration](../brand-configuration.md).

## Conséquences

### Positives

- impacts visibles avant publication ;
- reproductibilité des campagnes et productions ;
- contrôles de conformité exploitables par le moteur ;
- même mécanisme pour couleurs, polices, logos, composants et règles ;
- guide de marque toujours synchronisé avec la configuration effective.

### Coûts et contraintes

- modèle de dépendances et migrations à maintenir ;
- interface de brouillon et de publication plus riche qu'un simple formulaire ;
- nécessité d'éditeurs spécialisés pour conserver une expérience visuelle ;
- évolution des schémas IndexedDB, JSON et ZIP avec compatibilité ascendante.

## Hors périmètre de cette décision

- collaboration temps réel ;
- publication vers les réseaux sociaux ;
- remplacement immédiat du moteur de scène ;
- migration automatique de toutes les catégories d'objets dès le premier incrément.
