# Prochaine session

## Références et état

Lire README.md, ROADMAP.md, architecture.md, studio-organization.md,
brand-configuration.md, creative-lab.md, editor.md, core-api.md et resolved-scene.md.
Les décisions validées sont dans Organisation du studio et l'ADR 0004.
Le noyau 0.1, l'éditeur 0.2 et le laboratoire sont intégrés sur main.
GitHub Pages est actif avec publication publique autorisée depuis le 11 septembre
2026. Les campagnes et ressources importées restent locales.

## Tranches réalisées du jalon 0.3

### Direction créative persistée

Cinq axes portés par la campagne : énergie, expression colorée, échelle graphique,
densité, dominante. Ressource image, sauvegarde/restauration et JSON/ZIP.
Les supports héritent des réglages, avec ajustements explicites réinitialisables
selon les capacités du template. Les recettes v1 sont migrées vers v2 et copiées
sans dépendance mutable.

### Branding et ressources locales

Voir branding.md : identité locale, palette par rôle, logos et polices,
application explicite aux campagnes, sauvegarde/restauration ZIP.
IndexedDB v2 déduplique les fichiers et migre les campagnes existantes sans changer
leurs révisions ni inventer leurs fichiers absents. Les instantanés restent isolés.
Switch clair/sombre du studio et sélection/import local des polices du site livrés.
Ces outils restent accessibles pendant la migration vers Brand Configuration.

### Scène résolue, typographie et pagination

Voir resolved-scene.md : `src/render/scene.ts` consomme les contenus/placements
résolus et une mesure injectée ; il produit des pages sérialisables sans React.
L'aperçu des supports utilise les polices locales de la campagne, recalcule après
chargement, ajuste les textes et respecte les modes error/compact/paginate.
Un événement reste entier, son ordre est conservé et aucun contenu n'est tronqué.
Navigation de pages et affichage facultatif des marges/zones d'exclusion.
Déplacement, ajustements locaux et échanges JSON/ZIP sont conservés.
Aucune migration du schéma de campagne, aucun export graphique livré.

### Éditorial et médiathèque (0.3.0-alpha.3)

Voir editorial.md : rédaction locale autonome d'articles/annonces/présentations/
événements, statuts, thèmes, mise en forme simple et images associées. Médiathèque
visuelle, recherche/filtre, édition des métadonnées, insertion dans un support actif.
ZIP par contenu et ZIP complet des ressources, restaurations sans écrasement.
Les campagnes sélectionnent des instantanés ordonnés et portent des liaisons vers
leurs champs ; Note éditoriale de travail sur cinq formats. Les fichiers restent
dédupliqués. Campagne v3 et IndexedDB v3, migrations explicites sans perte de révision.

### Brand Configuration — première verticale livrée dans la PR 0.3b

Voir brand-configuration.md. Le nouvel espace Marque est piloté par des objets typés,
relations, brouillons, lots de changements et releases immuables. La tranche
`color.primary` couvre :

- migration déterministe depuis Brand v2 ;
- analyse d'impact et contrôles de contraste ;
- sauvegarde du brouillon distincte de la publication ;
- import/export contrôlé et concurrence optimiste ;
- adoption d'une release par une campagne neuve ;
- migration explicite d'une campagne existante en préservant les instantanés ;
- reconstruction des rôles couleurs, polices et logos depuis la release choisie ;
- compatibilité défensive avec les anciennes couleurs CSS et configurations partielles.

L'éditeur Branding historique reste monté sous « Outils historiques » jusqu'au portage
des fonctions de palette complète, ressources, polices et logos dans le nouveau modèle.
Il ne constitue pas une seconde source de vérité implicite.

## Template concert illustré — intégré

L'affiche fournie le 11 septembre 2026 est la référence visuelle : photographie
de guitare/lumières de scène et zones sombres, grand lettrage expressif, agenda
multi-événements en colonnes, accents colorés, soulignements et petits ornements,
trois alpagas colorés au premier plan en bas.

La première composition est intégrée au catalogue dans `catalog/templates/concert-illustrated.json`,
référencée par l’éditeur et testée sur les cinq formats. Elle contient des calques indépendants
pour le fond, le halo, la photo de scène, l’accroche, le titre, l’agenda, l’accent et trois
emplacements d’alpagas. Les images sont facultatives mais leurs absences sont signalées dans
l’aperçu ; aucune ressource réelle n’a été ajoutée aux fixtures.

La scène actuelle est un socle mesuré et paginé, pas encore l'affiche artistique
finale. PNG/JPEG/PDF restent au jalon 0.4 ; leur adaptation devra réutiliser la scène
et les polices, sans calcul de mise en page divergent.

## Prochain incrément : Bibliothèque

Construire Bibliothèque comme une projection des stockages existants, pas comme un
nouveau silo :

1. indexer les ressources canoniques dédupliquées par SHA-256 ;
2. calculer leurs usages dans les releases de marque, campagnes et contenus ;
3. réunir recherche, fiche ressource, crédits, droits et usages dans une interface
   catalogue / fiche / inspecteur cohérente avec Marque ;
4. réutiliser les opérations actuelles d'import et de métadonnées pendant la migration ;
5. réunir progressivement les contenus éditoriaux dans le même espace ;
6. seulement après stabilisation, promouvoir le shell global vers
   **Marque / Bibliothèque / Campagnes / Publications**.

Bibliothèque ne doit réécrire aucun instantané historique. Une ressource absente du
catalogue canonique reste signalée comme telle ; elle n'est jamais inventée par l'index.

## Autres travaux 0.3 à poursuivre

Marque : étendre releases et impacts aux règles de logos, palettes multiples et variantes
typographiques.
Bibliothèque : classement avancé, suppression contrôlée, audio/vidéo/documents.
Contenus : Ligne éditoriale, éditeur riche, actualisation comparée des instantanés,
sauvegarde groupée.
Productions : formats, templates, canaux ; bindings, overrides et sélections ordonnées.

La persistance éditoriale partagée relève du jalon 0.6 : adaptateur authentifié,
droits, fichiers privés et conflits de révision. Supabase reste optionnel ; aucun
service cloud n'est activé.

Préserver domaine indépendant, autonomie statique, révisions et JSON/ZIP.
Exécuter `npm run check` et `npm run test:e2e`, y compris les recettes Brand Configuration
et scène. Ne pas présenter les projections futures comme déjà disponibles.
