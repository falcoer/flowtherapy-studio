# Publication GitHub Pages — intégration préparée

Le workflow `Publish studio to GitHub Pages` est prêt, mais aucun site n'est
activé ou publié par cette intégration. Il complète le jalon 0.2 et ne change pas
le périmètre des exports graphiques.

## Visibilité à décider avant activation

Le dépôt `falcoer/flowtherapy-studio` est privé et appartient à un compte personnel.
GitHub Pages depuis un dépôt privé nécessite un forfait compatible, par exemple
GitHub Pro pour un compte personnel ; le forfait actuel n'a pas été vérifié.
Un dépôt privé ne rend pas son site Pages privé. L'option proposée ici publie
l'application et son catalogue intégré en accès public, sans authentification.
Cela nécessite une décision explicite par rapport à la consigne actuelle de
conserver un studio privé. Aucun changement de visibilité du dépôt n'est prévu.

Les campagnes saisies et images importées restent dans IndexedDB côté navigateur :
elles ne sont pas envoyées à GitHub. Les fichiers dist contiennent cependant le
code client et les définitions intégrées au build, qui deviennent accessibles.
`noindex` limite l'indexation volontaire, sans assurer la confidentialité.

Attention : IndexedDB est isolé par origine (protocole, domaine, port), pas par
chemin URL. Plusieurs projets sous le même domaine utilisateur github.io partagent
une origine ; cette adresse ne fournit pas d'isolation vis-à-vis des scripts des
autres projets du même domaine. Un domaine dédié sépare les stockages. Le passage
du localhost au site hébergé, ou un changement de domaine, nécessite un export ZIP
puis import pour retrouver une campagne.

## Activation après décision

1. Intégrer successivement les PR 0.1, 0.2 puis cette intégration sur main.
2. Vérifier le forfait et choisir Settings → Pages → Source : GitHub Actions.
   Conserver le dépôt privé. Si GitHub réclame un changement de forfait, ne pas
   rendre le dépôt public pour contourner cette condition.
3. Dans l'environnement github-pages, limiter les déploiements à main.
4. Lancer manuellement `Publish studio to GitHub Pages` sur main en cochant
   `accept_public_site` seulement après acceptation de la visibilité publique.
5. Vérifier l'URL retournée par le job deploy et l'ouverture du studio ; effectuer
   la recette de création/sauvegarde/rechargement depuis cette origine.

Le workflow est absent des déclenchements push et pull_request. Une fusion seule
ne publie rien. Le déclenchement sur une autre branche ou sans la case cochée ne
lance pas les jobs. `configure-pages` ne crée pas automatiquement le site.

## Construction

Le job build exécute `npm ci`, `npm run check` et la recette Chromium. Seul `dist/`
est transmis à Pages, jamais la racine du dépôt, les tests, archives ou documents.
Vite génère des chemins relatifs : le build convient au sous-chemin du projet
ainsi qu'à la racine d'un domaine dédié. Pas de route client profonde actuellement.
Le job deploy dépend du build ; lui seul reçoit pages:write et id-token:write.
L'environnement github-pages porte l'URL de publication.

## Références

- [Disponibilité de Pages et types de sites](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Configurer la source de publication](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Workflows Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
