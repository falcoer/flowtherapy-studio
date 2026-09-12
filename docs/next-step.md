# Prochaine session

## Références et état

Lire README.md, ROADMAP.md, architecture.md, studio-organization.md,
creative-lab.md, editor.md, core-api.md et resolved-scene.md.
Les décisions validées sont dans Organisation du studio.
Le noyau 0.1, l'éditeur 0.2 et le laboratoire sont intégrés sur main.
GitHub Pages est actif avec publication publique autorisée depuis le 11 septembre
2026. Les campagnes et ressources importées restent locales.

## Tranches réalisées du jalon 0.3

### Direction créative persistée

Cinq axes portés par la campagne : énergie, expression colorée, échelle graphique,
densité, dominante. Ressource image, sauvegarde/restauration et JSON/ZIP.
Les supports héritent des réglages, avec ajustements explicites réinitialisables
selon les capacités du template. Les recettes v1 sont migrées vers v2 et copiées
sans dépendance mutable. Navigation Branding / Éditorial / Médias / Campagnes ;
laboratoire dans Campagnes > campagne > Direction créative.

### Branding et ressources locales

Voir branding.md : identité locale, palette par rôle, logos et polices,
application explicite aux campagnes, sauvegarde/restauration ZIP.
IndexedDB v2 déduplique les fichiers et migre les campagnes existantes sans changer
leurs révisions ni inventer leurs fichiers absents. Les instantanés restent isolés.
Switch clair/sombre du studio et sélection/import local des polices du site livrés.

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
Les articles longs ne sont pas paginés et la mise en forme riche ne passe pas dans
les calques texte : le corps original reste conservé dans l'instantané.

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

Suite à construire :

1. Identifier/importer les ressources autorisées du groupe avec provenance,
   droits et crédits ; ne pas intégrer de photo personnelle ou campagne réelle
   dans les fixtures. SVG non accepté sans nettoyage dédié.
2. Enrichir la composition des collections en blocs/colonnes, la hiérarchie
   typographique et les ornements. Appliquer les cinq axes créatifs à cette scène,
   dans les capacités déclarées, sans modifier les instantanés déjà créés.
3. Sélectionner/importer les ressources autorisées avec provenance, droits et crédits.
4. Valider visuellement chaque format, la sécurité des zones, les titres longs
   et les agendas denses avant de présenter le template comme prêt à produire.

La scène actuelle est un socle mesuré et paginé, pas encore l'affiche artistique
finale. Les logos ne sont pas insérés automatiquement sans calque dédié.
PNG/JPEG/PDF restent au jalon 0.4 ; leur adaptation devra réutiliser la scène et
les polices, sans calcul de mise en page divergent.

## Autres travaux 0.3 à poursuivre

Branding : règles de logos, palettes multiples, variantes typographiques.
Médiathèque : classement avancé, suppression contrôlée, audio/vidéo/documents.
Éditorial : Ligne éditoriale, éditeur riche, actualisation comparée des instantanés,
sauvegarde groupée de tous les contenus.
Médias : formats, templates, canaux ; bindings, overrides et sélections ordonnées.

La persistance éditoriale partagée relève du jalon 0.6 : adaptateur authentifié,
droits, fichiers privés et conflits de révision. Supabase reste optionnel ; aucun
service cloud n'est activé.

Préserver domaine indépendant, autonomie statique, révisions et JSON/ZIP.
Exécuter `npm run check` et `npm run test:e2e`, y compris la recette de scène.
Ne pas présenter les tiroirs ou fonctions futurs comme déjà disponibles.
