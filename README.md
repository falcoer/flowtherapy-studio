# Flow Therapy Studio

Atelier graphique privé du groupe : créer une campagne, renseigner ses événements,
décliner des templates, retoucher les compositions et exporter pour les réseaux
sociaux et l'impression.

## État

Jalon 0.1 : noyau TypeScript implémenté, contrats validés, résolution des contenus,
snapshots et import/export JSON/ZIP avec contrôle des assets. L'éditeur et les
exporteurs graphiques ne sont pas encore implémentés. Aucun hébergement activé.

## Principes

- Site statique, React/TypeScript prévu ; édition et export dans le navigateur.
- Fonctionnement autonome : IndexedDB, import/export JSON et archive ZIP avec assets.
- Catalogue commun versionné ; personnalisations locales, puis stockage partagé facultatif.
- Campagnes multi-événements, supports et variantes de templates par format.
- PNG/JPEG et PDF standard ; texte/vectoriel préservé quand possible dans le PDF.
- Publication sociale et animation : extensions ultérieures.

## Lire et poursuivre

- [Périmètre et parcours](docs/product.md)
- [Architecture](docs/architecture.md)
- [Modèle de données](docs/data-model.md)
- [API du noyau](docs/core-api.md)
- [Format d’archive ZIP](docs/archive-format.md)
- [Décisions](docs/decisions/0001-static-campaign-studio.md)
- [Roadmap](ROADMAP.md)
- [Prochaine étape](docs/next-step.md)
- [Mise en place GitHub](docs/repository-setup.md)

`npm ci` puis `npm run check` (Node >= 22) vérifient les schémas générés, le typage,
les tests du noyau et les fixtures. ZIP v1 : STORE sans compression ; PNG/JPEG et
polices acceptés, SVG refusés en attendant un nettoyage dédié.

Le dépôt doit rester privé. Une protection de l'application hébergée est également
nécessaire : la confidentialité du dépôt ne protège pas le site déployé.

Aucune licence open source n'est attribuée à ce stade. Les droits des photos,
logos, illustrations et polices devront être renseignés avant leur intégration.

