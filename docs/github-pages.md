# Publication GitHub Pages — autorisée

La publication publique de l’application a été acceptée par le propriétaire
le 11 septembre 2026. Le workflow publie main après les tests ; la première
activation administrative de Pages reste nécessaire. Il complète le jalon 0.2 et ne change pas
le périmètre des exports graphiques.

## Décision de visibilité

Le dépôt `falcoer/flowtherapy-studio` est privé et appartient à un compte personnel.
GitHub Pages depuis un dépôt privé nécessite un forfait compatible, par exemple
GitHub Pro pour un compte personnel ; le forfait actuel n'a pas été vérifié.
Un dépôt privé ne rend pas son site Pages privé. L'option proposée ici publie
l'application et son catalogue intégré en accès public, sans authentification.
Cette exception à la consigne de confidentialité par défaut a été explicitement
autorisée par le propriétaire. Aucun changement de visibilité du dépôt n’est prévu.
Le lien ne sera pas diffusé, ce qui ne constitue pas un contrôle d’accès.

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

## Première activation

1. Les PR 0.1 et 0.2 sont intégrées ; intégrer la PR de publication sur main.
2. Vérifier le forfait et choisir Settings → Pages → Source : GitHub Actions.
   Conserver le dépôt privé. Si GitHub réclame un changement de forfait, ne pas
   rendre le dépôt public pour contourner cette condition.
3. Dans l'environnement github-pages, limiter les déploiements à main.
4. Après activation, relancer le workflow de publication échoué, ou lancer
   manuellement `Publish studio to GitHub Pages` sur main avec `accept_public_site`.
   Les mises à jour suivantes de main déclencheront automatiquement les tests et la publication.
5. Vérifier l'URL retournée par le job deploy et l'ouverture du studio ; effectuer
   la recette de création/sauvegarde/rechargement depuis cette origine.

Le workflow se déclenche sur les push de main et manuellement, jamais sur les PR.
Le déclenchement manuel sur une autre branche ou sans acceptation ne lance pas
les jobs. `configure-pages` ne crée pas automatiquement le site : l’action officielle
exige un jeton administratif distinct pour la première activation. Le connecteur
GitHub disponible ne propose pas cette opération administrative.

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
