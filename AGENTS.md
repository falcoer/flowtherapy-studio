# Consignes de contribution

Lire README.md, ROADMAP.md, docs/architecture.md et docs/next-step.md avant travaux.
Ne pas confondre fonctionnalités prévues et fonctionnalités implémentées.
Préserver le fonctionnement statique sans API ; isoler toute persistance distante.
Le domaine ne dépend ni de React ni d'un fournisseur cloud.
Versionner les documents et prévoir des migrations explicites avant changement incompatible.
Pas de secret, jeton social, campagne réelle ou photo personnelle dans les exemples.
Ne pas rendre le site public par défaut. Contrôler aussi les URL de prévisualisation.
Les données de campagne sont communes ; les ajustements de composition sont locaux.
Ne jamais tronquer un événement ou du texte silencieusement.
Maintenir la roadmap et documenter les limitations réelles des exports.
Exécuter npm run check ; ajouter des tests pertinents lors de l'implémentation du moteur.
Les fixtures utilisent des événements fictifs.
