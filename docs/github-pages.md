# Publication GitHub Pages — active

La publication publique de l’application a été acceptée par le propriétaire
le 11 septembre 2026. Le workflow publie `main` après les tests et est actif.
Il complète le jalon 0.2 et ne change pas
le périmètre des exports graphiques.

## Décision de visibilité

Le dépôt `falcoer/flowtherapy-studio` est public et appartient à un compte personnel.
GitHub Pages publie l'application et son catalogue intégré en accès public,
sans authentification. Cette visibilité a été explicitement autorisée par le
propriétaire ; les campagnes ne sont pas publiées.

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

## Fonctionnement actuel

1. `main` déclenche automatiquement les contrôles et la publication.
2. Le workflow ne transmet que `dist/` à Pages, après `npm run check` et la
   recette Chromium complète.
3. L'application est accessible à l'adresse
   `https://falcoer.github.io/flowtherapy-studio/`.

Le workflow se déclenche sur les push de main et manuellement, jamais sur les PR.
Le déclenchement manuel sur une autre branche ou sans acceptation ne lance pas
les jobs. La première activation administrative de Pages a été effectuée ; le
connecteur GitHub n'intervient ensuite que sur le dépôt et les workflows.

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
