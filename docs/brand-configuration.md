# Brand Configuration — modèle cible et migration

Ce document complète l'[ADR 0004](decisions/0004-brand-configuration-management.md).
Il définit le premier modèle exploitable sans figer prématurément l'ensemble du
domaine.

## Objectif

Permettre de modifier une configuration de marque, comprendre ses conséquences,
publier une version immuable et choisir explicitement si une campagne doit migrer.

## Agrégats principaux

| Objet | Responsabilité |
| --- | --- |
| `Brand` | Identité stable de la marque et pointeurs vers ses versions |
| `BrandObject` | Élément typé : jeton, logo, typographie, composant, principe ou règle |
| `BrandRelation` | Dépendance typée entre deux objets |
| `ChangeSet` | Lot ordonné de créations, modifications et retraits |
| `BrandRelease` | Version publiée, immuable et validée |
| `CampaignBrandSnapshot` | Copie reproductible de la configuration utilisée par une campagne |
| `ValidationFinding` | Résultat d'un contrôle avec portée et sévérité |
| `MigrationPlan` | Choix explicite de propagation vers des objets consommateurs |

## Forme minimale

Un `BrandObject` possède au minimum :

- un identifiant stable ;
- un type et un rôle sémantique ;
- une valeur structurée ;
- un statut ;
- une révision ;
- des métadonnées de provenance et de droits lorsque nécessaire.

Une `BrandRelation` relie une source à une cible avec un type explicite, par
exemple `uses`, `constrains`, `replaces`, `compatibleWith` ou `derivedFrom`.

Un `BrandRelease` contient l'identité de marque, un numéro de version, les
révisions exactes des objets, les relations, les règles validées et l'empreinte de
son contenu.

## Cycle de vie

1. Créer ou reprendre un brouillon.
2. Modifier des objets dans un `ChangeSet`.
3. Calculer les dépendances directes et transitives.
4. Exécuter les contrôles.
5. Construire un `MigrationPlan`.
6. Publier un `BrandRelease`.
7. Migrer séparément les campagnes sélectionnées.

Les campagnes non sélectionnées restent inchangées.

## Analyse d'impact

Le premier moteur d'impact reste déterministe. Pour chaque opération, il retourne :

- objets directement modifiés ;
- objets dépendants ;
- templates et composants consommateurs ;
- campagnes rattachées à la version courante ;
- contrôles devenus invalides ou à réexécuter ;
- migrations automatiques possibles ;
- interventions manuelles nécessaires.

Une analyse incomplète doit être signalée comme telle ; elle ne peut pas être
présentée comme une validation réussie.

## Première tranche verticale

La tranche de référence porte sur `color.primary`.

### Parcours

- ouvrir la fiche « Bleu Flow » ;
- modifier sa valeur dans le brouillon ;
- prévisualiser les composants consommateurs ;
- recalculer les contrastes ;
- afficher les templates et campagnes concernés ;
- publier une nouvelle release ;
- constater qu'une campagne historique conserve son instantané ;
- migrer une campagne de test explicitement.

### Critères d'acceptation

- aucune écriture directe dans une release publiée ;
- rapport d'impact reproductible pour un même brouillon ;
- publication atomique ;
- ancien instantané toujours rendu à l'identique ;
- nouvelle campagne pouvant sélectionner la nouvelle release ;
- import/export sans perte du lot, de la release et des relations.

## Migration depuis Brand v2

### Principes

- aucune perte de ressource, crédit, droit ou provenance ;
- conservation des identifiants externes lorsqu'ils sont valides ;
- absence de propagation automatique aux campagnes ;
- migration idempotente et couverte par des fixtures ;
- ancien format lisible pendant la période de transition.

### Correspondances initiales

| Brand v2 | Cible |
| --- | --- |
| palette claire/sombre par rôle | objets `color-token` et relations de thème |
| références de logos | objets `logo` référant les ressources existantes |
| rôles typographiques | objets `font-role` et ressources de police |
| révision d'identité | release importée initiale |
| copie dans une campagne | `CampaignBrandSnapshot` historique |
| métadonnées d'asset | ressources partagées inchangées |

### Phases

1. Ajouter les nouveaux schémas sans modifier le rendu existant.
2. Importer Brand v2 vers une release initiale et vérifier le round-trip.
3. Introduire brouillon, lot de changements et analyse d'impact pour les couleurs.
4. Brancher les nouvelles campagnes sur les releases.
5. Proposer la migration explicite des campagnes existantes.
6. Étendre le mécanisme aux typographies, logos, composants et règles.
7. Retirer l'écriture Brand v2 uniquement après validation des archives historiques.

## Conséquences sur l'interface

La navigation et le panneau d'impact sont des projections du même modèle :

- catalogue visuel des objets ;
- fiche normalisée avec Définition, Règles, Aperçu, Usages et Historique ;
- état Brouillon ou Version publiée toujours visible ;
- barre de lot de changements ;
- comparaison avant/après ;
- commande de publication distincte de l'enregistrement local.

Le guide de marque reste disponible en lecture et à l'export, généré à partir d'une
release sélectionnée.
