# Flow Therapy Studio

Atelier graphique privé du groupe : créer une campagne, renseigner ses événements,
décliner des templates, retoucher les compositions et exporter pour les réseaux
sociaux et l'impression.

## État

Socle de conception préparé le 11 septembre 2026. L'éditeur et les exporteurs ne
sont pas encore implémentés. Les contrats TypeScript et exemples sont une première
spécification, à stabiliser au jalon 0.1. Aucun hébergement n'est activé.

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
- [Décisions](docs/decisions/0001-static-campaign-studio.md)
- [Roadmap](ROADMAP.md)
- [Prochaine étape](docs/next-step.md)
- [Mise en place GitHub](docs/repository-setup.md)

`npm run check` vérifie les exemples et références avec Node, sans dépendance.
Ce contrôle n'est pas encore une validation exhaustive des imports utilisateur.

Le dépôt doit rester privé. Une protection de l'application hébergée est également
nécessaire : la confidentialité du dépôt ne protège pas le site déployé.

Aucune licence open source n'est attribuée à ce stade. Les droits des photos,
logos, illustrations et polices devront être renseignés avant leur intégration.
