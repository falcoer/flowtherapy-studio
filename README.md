# Flow Therapy Studio

Atelier graphique privé du groupe : créer une campagne, renseigner ses événements,
décliner des templates, retoucher les compositions et exporter pour les réseaux
sociaux et l'impression.

## État

Le noyau 0.1 et l'éditeur statique minimal 0.2 sont intégrés sur main. Campagnes/événements, activation Agenda, déplacement,
recadrage PNG/JPEG, annulation, IndexedDB et échanges JSON/ZIP sont disponibles.
L'aperçu reste provisoire ; les exports graphiques et templates de production ne
sont pas encore livrés. L’[intégration GitHub Pages](docs/github-pages.md)
publie main après les tests. Le laboratoire (PR #4) est intégré et publié depuis
le 11 septembre 2026, avec l’accord du propriétaire.

```sh
npm ci
npm run dev
```

Voir [l'éditeur local et ses limites](docs/editor.md). Le serveur écoute 127.0.0.1.

## Laboratoire créatif

Le [laboratoire](docs/creative-lab.md) édite les cinq axes de la Direction créative
persistée avec la campagne. Les supports héritent de cette direction et peuvent
porter des ajustements réinitialisables selon les capacités du template. Trois
harmonies, des recettes locales exportables et un aperçu carré/story/affiche sont
disponibles en React + Motion, sans serveur applicatif.

## Organisation validée

**Branding / Éditorial / Médias / Campagnes** : voir les
[décisions de référence](docs/studio-organization.md).
Les ressources sont partagées sans duplication. Médias regroupe formats, templates
et canaux. Le laboratoire est l’éditeur de la Direction créative d’une campagne.
L’apparence du studio et des médias est provisoire.

## Principes

- Site statique, React/TypeScript ; édition et export dans le navigateur.
- Fonctionnement autonome : IndexedDB, import/export JSON et archive ZIP avec assets.
- Catalogue commun versionné ; personnalisations locales, puis stockage partagé facultatif.
- Campagnes multi-événements, supports et variantes de templates par format.
- PNG/JPEG et PDF standard ; texte/vectoriel préservé quand possible dans le PDF.
- Publication sociale et animation : extensions ultérieures.

## Lire et poursuivre

- [Organisation du studio](docs/studio-organization.md)
- [Périmètre et parcours](docs/product.md)
- [Architecture](docs/architecture.md)
- [Modèle de données](docs/data-model.md)
- [API du noyau](docs/core-api.md)
- [Format d’archive ZIP](docs/archive-format.md)
- [Décisions : studio statique](docs/decisions/0001-static-campaign-studio.md)
- [Décisions : Supabase et sous-domaine](docs/decisions/0002-supabase-and-studio-domain.md)
- [Roadmap](ROADMAP.md)
- [Prochaine étape](docs/next-step.md)
- [Mise en place GitHub](docs/repository-setup.md)

`npm ci` puis `npm run check` (Node >= 22.12) vérifient les schémas générés, le typage,
les tests du noyau, du stockage et les fixtures, puis le build statique.
`npm run test:e2e` exécute la recette Chromium (voir docs/editor.md). ZIP v1 : STORE sans compression ; PNG/JPEG et
polices acceptés, SVG refusés en attendant un nettoyage dédié.

Le dépôt et l’application sur Pages sont publics avec l’accord du propriétaire ;
les campagnes et images importées restent dans le navigateur.
La confidentialité du dépôt ne protège pas le site déployé.

Aucune licence open source n'est attribuée à ce stade. Les droits des photos,
logos, illustrations et polices devront être renseignés avant leur intégration.
