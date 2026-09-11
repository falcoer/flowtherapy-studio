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

## Priorité suivante du jalon 0.3

- Socle Branding : ressources identifiées, logos, palettes et typographies par rôle.
- Ressources centralisées, référencées sans duplication depuis Branding, Éditorial
  et Campagnes ; fichiers, crédits et droits communs, usages locaux distincts.
- Éditorial : contenus et médiathèque liés ; Ligne éditoriale en sous-section.
- Médias : formats, templates et canaux transversaux.
- Catalogue et variantes personnalisables ; bindings, overrides et sélections ordonnées.
- Scène résolue commune, mesure typographique, débordements, compactage et pagination.
- Validation graphique des templates et zones de sécurité par format.

Préserver le domaine indépendant de React, l'autonomie statique, les révisions
et les échanges JSON/ZIP. Exécuter npm run check et npm run test:e2e pour l'implémentation.
Le rendu actuel est provisoire ; PNG/JPEG/PDF restent au jalon 0.4.
