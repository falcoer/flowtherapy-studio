# Prochaine session

## Références et état

Lire README.md, ROADMAP.md, architecture.md, studio-organization.md,
creative-lab.md, editor.md et core-api.md.
Les décisions validées sont dans [Organisation du studio](studio-organization.md).

Le noyau 0.1, l'éditeur 0.2 et le laboratoire (PR #4) sont intégrés sur main.
GitHub Pages est actif ; publication publique autorisée et déploiement du laboratoire
réussi le 11 septembre 2026. Les campagnes restent locales.

## Tranche réalisée : direction créative persistée

1. Direction créative rattachée à la campagne : cinq axes (énergie, expression
   colorée, échelle graphique, densité, dominante), sauvegarde/restauration et JSON/ZIP.
   La structure de campagne v1 reste rétrocompatible ; les recettes v1 sont
   migrées explicitement vers v2.
2. Laboratoire complété : expression colorée distincte du choix de palette,
   dominante Image/Texte/Équilibrée et ressource image sélectionnée lorsque nécessaire.
3. Supports héritant de la direction de campagne ; ajustements locaux
   explicites, réinitialisables, avec capacités déclarées par template.
   Une recette copie des réglages vers une campagne, sans dépendance mutable implicite.
4. Navigation Branding / Éditorial / Médias / Campagnes posée.
   Le laboratoire se trouve dans Campagnes > campagne > Direction créative.
   Ne pas présenter les tiroirs futurs comme des fonctions déjà disponibles.

Critère couvert par les tests de domaine : modifier la direction sur deux supports
de formats différents, sérialiser puis rouvrir la campagne et retrouver les réglages.
Vérifier aussi le round-trip JSON/ZIP, l'isolation des ajustements locaux et
l'absence de perte silencieuse des informations obligatoires.

## Tranche réalisée : socle Branding et ressources locales

Voir [parcours, stockage et limites](branding.md). L'écran Branding expose une
identité locale, palette par rôle, logos et références de polices ; application
explicite aux campagnes et sauvegarde/restauration d'identité ZIP. Les ressources
sont réutilisables dans les supports. IndexedDB v2 déduplique les fichiers et migre
les campagnes existantes sans changer leurs révisions ni remplir leurs fichiers absents.
Les instantanés de campagne restent isolés du référentiel.

## Complément : identité du site Flow Therapy

Voir [préréglage, provenance, préparation et limites](branding-flowtherapy.md).
Le catalogue versionné reprend les palettes claire/sombre de `flowtherapy-bio-website`,
Bangers / Inter / Kalam et le logo transparent. Les sources sont figées au commit
`883712401d1a3cdf8961dede819b8ec8cbd7195d`, contrôlées puis préparées en ZIP locaux
avant dev/build. Aucune dépendance distante dans le navigateur après sauvegarde.
Une identité existante n’est jamais remplacée automatiquement. Un aperçu de marque
charge les vrais fichiers ; ce n’est pas encore le moteur de rendu des campagnes.
Alpagas et ornements restent des références documentées, non des assets importés.

## Persistance éditoriale partagée — planifiée

La persistance partagée des contenus et ressources éditoriales n’est pas implémentée
au jalon 0.3. Elle relève du jalon 0.6 et dépend d’un adaptateur authentifié, de droits
d’accès, de fichiers privés et de conflits de révision ; Supabase reste optionnel et
aucun service cloud n’est activé.

## Priorité suivante du jalon 0.3

- Relier les rôles du Branding à la scène résolue des templates et aux harmonies
  de campagne, sans confondre identité stable et Direction créative.
- Enrichir Branding : règles de logos, palettes multiples et variantes typographiques.
- Compléter la médiathèque : miniatures, recherche, gestion des crédits/droits
  et sauvegarde intégrale ; relier les contenus Éditorial aux ressources communes.
- Éditorial : contenus et médiathèque liés ; Ligne éditoriale en sous-section.
- Médias : formats, templates et canaux transversaux.
- Catalogue et variantes personnalisables ; bindings, overrides et sélections ordonnées.
- Scène résolue commune, mesure typographique, débordements, compactage et pagination.
- Validation graphique des templates et zones de sécurité par format.

Préserver le domaine indépendant de React, l'autonomie statique, les révisions
et les échanges JSON/ZIP. Exécuter npm run check et npm run test:e2e pour l'implémentation.
Le rendu actuel est provisoire ; PNG/JPEG/PDF restent au jalon 0.4.
