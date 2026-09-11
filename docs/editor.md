# Éditeur local 0.2

## Démarrer

```sh
npm ci
npm run dev
```

Ouvrir l'adresse locale affichée (127.0.0.1). Le serveur écoute seulement la boucle
locale. Aucun hébergement ni workflow de déploiement n'est configuré.
`npm run build` crée les fichiers statiques dans `dist/` ; `npm run preview`
permet de consulter ce build localement. La balise noindex n'est pas une protection
d'accès : tout hébergement futur devra protéger le domaine et ses URL alternatives.

## Parcours disponible

1. Nommer la campagne et renseigner son titre commun.
2. Ajouter les événements : date civile, libellé et lieu. Les boutons haut/bas
   changent leur ordre ; la suppression et la saisie sont annulables.
3. Choisir un format et activer le template Agenda. Chaque activation crée un
   support autonome avec une variante et ses snapshots. Le catalogue intégré
   reste une fixture ; la gestion avancée des variantes appartient au jalon 0.3.
4. Choisir un calque. Le déplacer à la souris/au toucher, avec les flèches du
   clavier (Maj : pas de 10 unités), ou saisir X/Y/largeur/hauteur. Les unités
   sont celles du format (px ou mm). Un déplacement est une seule opération
   d'historique. Les permissions d'édition du calque sont respectées.
5. Ajouter une image PNG/JPEG après saisie de ses droits, choisir « remplir » ou
   « image entière » et déplacer le point de cadrage horizontal/vertical. Le
   template embarqué devient une définition locale dérivée ; le catalogue Git
   n'est pas modifié. L'image est ajoutée aux layouts du support sélectionné.
6. Annuler/rétablir les éditions (50 états antérieurs), réinitialiser les
   ajustements du calque ou retirer un support. Les ressources suivent l'historique.
7. Enregistrer, puis rouvrir via « Mes campagnes locales ». La réouverture n'est
   pas automatique au lancement. Exporter un ZIP comme sauvegarde indépendante
   du navigateur ; le JSON seul ne contient pas les octets des images.

Les données importées sont conservées intégralement ; l'interface expose les
chaînes et collections du contenu commun, et les placements des supports.
Les bindings, overrides de contenu, sélections d'événements, chartes et définitions
avancées importés restent conservés mais n'ont pas encore de formulaire spécialisé.
Une suppression qui casse une référence ou un minimum de collection est signalée
et empêche l'enregistrement ; annuler ou compléter la saisie pour la corriger.

## Persistance et conflits

`IndexedDBCampaignStore` implémente `CampaignStore` avec `loadBundle` et
`saveBundle`. Depuis le socle Branding, IndexedDB v2 conserve les octets une seule
fois par SHA-256 et les documents les référencent. Révision, document et fichiers
sont enregistrés atomiquement après validation sur copie. La migration v1 conserve
les campagnes existantes ; voir [stockage commun et limites](branding.md).
Une création attend `null`, une mise à jour la révision chargée ; la révision est
incrémentée par le store. La suppression exige aussi cette révision.

Un conflit ne modifie pas la version stockée ni le travail en mémoire : recharger
la version enregistrée (avec confirmation d'abandon si nécessaire), enregistrer
une copie avec un nouvel identifiant, ou exporter le travail. Annuler une édition
ne ramène pas la révision de stockage en arrière. Les erreurs de quota/stockage
laissent le document en mémoire et les exports accessibles.

Les imports JSON/ZIP validés créent toujours un nouvel identifiant local, sans
écrasement implicite. Un JSON avec références d'assets absents est accepté et
signalé ; l'export ZIP est bloqué tant que les ressources manquent. Les signatures,
SHA-256 et limites de l'archive v1 sont réutilisés avant sauvegarde des octets.
Le ZIP reste STORE, 64 Mio, sans SVG. L'ajout d'image vérifie aussi son décodage.

## Aperçu et limites

L'aperçu DOM/CSS sert uniquement à l'édition : textes, formes, listes d'événements,
images PNG/JPEG, positions, rotations et cadrage. Il ne constitue pas encore la
scène déterministe commune aux exports. Aucune donnée importée n'est évaluée comme
HTML/script et aucune URL distante d'image/police n'est chargée.

Les polices système sont utilisées ; polices personnalisées, QR et vecteurs ont
un avertissement explicite. Le texte n'est ni tronqué ni réduit automatiquement.
Le débordement mesuré du DOM et les cadres hors surface sont signalés ; toutes les
lignes restent dans l'aperçu et dans les données. Les rotations invitent à vérifier
les limites. La mesure typographique définitive, compactage/pagination, zones de
sécurité et fidélité d'impression restent aux jalons 0.3/0.4.

Aucun export PNG/JPEG/PDF, authentification, synchronisation distante ou service
worker hors-ligne n'est livré. L'éditeur fonctionne sans API une fois chargé.
L'effacement des données du navigateur peut supprimer les campagnes locales.

## Vérification

- `npm run check` : schémas synchronisés, TypeScript, noyau, historique,
  concurrence/intégrité IndexedDB simulée et build statique.
- `npx playwright install chromium`, puis `npm run test:e2e` : recette Chromium
  avec IndexedDB réel, déplacement souris/clavier, recadrage, annulation,
  réouverture, JSON/ZIP, conflit entre onglets, viewport mobile et débordement.
- La CI exécute ces deux suites sous Node 22. Firefox/Safari restent à recetter.
