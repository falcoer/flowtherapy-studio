# Flow Therapy Studio

Atelier graphique du groupe : créer une campagne, renseigner ses événements,
décliner des templates, retoucher les compositions et exporter pour les réseaux
sociaux et l'impression.

## État

Le noyau 0.1 et l'éditeur statique minimal 0.2 sont intégrés sur main.
Campagnes/événements, activation Agenda, déplacement, recadrage PNG/JPEG,
annulation, IndexedDB et échanges JSON/ZIP sont disponibles.
Le jalon 0.3 ajoute Branding, ressources locales, direction créative et désormais
une [scène résolue](docs/resolved-scene.md) avec polices de campagne, mesure des
textes, compactage, pagination des événements et repères de sécurité.
Les exports graphiques et templates artistiques de production ne sont pas encore
livrés. L'[intégration GitHub Pages](docs/github-pages.md) publie main après tests ;
l'accès public a été autorisé par le propriétaire.

```sh
npm ci
npm run dev
```

Voir [l'éditeur local et ses limites](docs/editor.md), complété par le
[moteur de scène 0.3](docs/resolved-scene.md). Le serveur écoute 127.0.0.1.

## Laboratoire créatif

Le [laboratoire](docs/creative-lab.md) édite les cinq axes de la Direction créative
persistée avec la campagne. Les supports héritent de cette direction et peuvent
porter des ajustements réinitialisables selon les capacités du template. Trois
harmonies, des recettes locales exportables et un aperçu carré/story/affiche sont
disponibles en React + Motion, sans serveur applicatif. L'application des cinq
axes à la scène générale des templates reste à construire.

## Branding et ressources

Le [socle Branding](docs/branding.md) permet de définir une identité locale,
associer palette, logos et polices par rôle, puis appliquer son instantané aux
campagnes. Les ressources sont réutilisables entre supports et campagnes, avec
stockage dédupliqué et migration des données existantes. ZIP d'identité disponible.
L'aperçu des supports utilise les polices disponibles de cet instantané : rôles
explicites `brand:<rôle>`, puis `title` et `body` par défaut lorsque aucune police
n'est déclarée. Les logos nécessitent encore un calque dédié ; ils ne sont pas
insérés automatiquement. Aucun chargement distant de police dans cet aperçu.

## Organisation validée

**Branding / Éditorial / Médias / Campagnes** : voir les
[décisions de référence](docs/studio-organization.md).
Les ressources sont partagées sans duplication. Médias regroupe formats, templates
et canaux. Le laboratoire est l'éditeur de la Direction créative d'une campagne.
L'apparence finale des médias reste à construire ; l'affiche de concerts illustrée
fournie le 11 septembre 2026 est la cible du prochain template.

## Principes

- Site statique, React/TypeScript ; édition et futurs exports dans le navigateur.
- Fonctionnement autonome : IndexedDB, import/export JSON et archive ZIP avec assets.
- Catalogue commun versionné ; personnalisations locales, puis stockage partagé facultatif.
- Campagnes multi-événements, supports et variantes de templates par format.
- Cible d'export : PNG/JPEG et PDF standard ; texte/vectoriel préservé quand possible.
- Publication sociale et animation : extensions ultérieures.

## Lire et poursuivre

- [Organisation du studio](docs/studio-organization.md)
- [Périmètre et parcours](docs/product.md)
- [Architecture](docs/architecture.md)
- [Modèle de données](docs/data-model.md)
- [API du noyau](docs/core-api.md)
- [Scène résolue et limites](docs/resolved-scene.md)
- [Format d'archive ZIP](docs/archive-format.md)
- [Décisions : studio statique](docs/decisions/0001-static-campaign-studio.md)
- [Décisions : Supabase et sous-domaine](docs/decisions/0002-supabase-and-studio-domain.md)
- [Roadmap](ROADMAP.md)
- [Prochaine étape](docs/next-step.md)
- [Mise en place GitHub](docs/repository-setup.md)

`npm ci` puis `npm run check` (Node >= 22.12) vérifient les schémas générés, le typage,
les tests du noyau, du stockage et de la scène, les fixtures et le build statique.
`npm run test:e2e` exécute la recette Chromium. ZIP v1 : STORE sans compression ;
PNG/JPEG et polices acceptés, SVG refusés en attendant un nettoyage dédié.

Le dépôt et l'application sur Pages sont publics avec l'accord du propriétaire ;
les campagnes et images importées restent dans le navigateur.
La confidentialité du dépôt ne protège pas le site déployé.

Aucune licence open source n'est attribuée au code à ce stade. Les droits des
photos, logos et illustrations devront être renseignés avant leur intégration ;
les polices du site importées par le préréglage conservent leur licence SIL OFL 1.1.
