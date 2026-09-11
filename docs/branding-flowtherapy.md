# Préréglage Flow Therapy — identité du site

## Source de référence

Le catalogue `catalog/brands/flowtherapy-website.json` reprend le dépôt
`falcoer/flowtherapy-bio-website`, commit
`883712401d1a3cdf8961dede819b8ec8cbd7195d`, pour le site
https://flowtherapymusic.com. Les références sont `styles.css`,
`assets-src/manifest.json` et `assets-src/README.md`. Ce n’est pas une nouvelle
proposition graphique ni une liaison mutable vers la branche main du site.
Le dépôt du site n’est pas modifié.

## Palette et typographie

| Rôle | Claire | Sombre |
| --- | --- | --- |
| Fond | `#fbf8f2` | `#07101d` |
| Surface | `#ffffff` | `#101a2b` |
| Texte | `#17171b` | `#fffaf1` |
| Texte secondaire | `#54515b` | `#c7c1ca` |
| Violet / Accent | `#7130c8` | `#9a48f0` |
| Orange / Contraste | `#ed7100` | `#ff8a00` |
| Rose | `#e72f88` | `#ff3b9d` |
| Bleu | `#168ad5` | `#19a7ef` |
| Séparateur | `#ded6cc` | `#34304c` |

Les noms `background`, `surface`, `text`, `muted`, `purple`, `orange`, `pink`,
`blue` et `line` correspondent aux variables du site (`background` reprend `--bg`).
`accent` et `contrast` sont les correspondances explicites avec les rôles déjà
présents dans le studio ; « Contraste » ne constitue pas une garantie de contraste
accessible pour toute association de deux couleurs. Après personnalisation,
les rôles sont indépendants et ne se synchronisent pas automatiquement.

Bangers est affectée aux titres, Inter au corps et Kalam aux légendes/accents
manuscrits. Le logo transparent d’origine est référencé pour les trois rôles
principal, fond clair et fond sombre : aucune variante inventée ou recolorée.

## Parcours et protection des données locales

À la première ouverture de Branding, sans identité enregistrée, le préréglage
clair est chargé en **brouillon**. Aucune campagne ni identité enregistrée n’est
écrasée. Une identité existante est relue directement depuis IndexedDB sans
requête de catalogue ; ses personnalisations restent intactes.

Les boutons « Charger Flow Therapy — clair/sombre » proposent une substitution
explicite du brouillon avec confirmation lorsqu’il y a une identité existante ou
des modifications. Ensuite : **Enregistrer l’identité**, puis
**Appliquer à la campagne**. L’enregistrement de la campagne conserve son
instantané indépendant. Aucune modification des cinq axes de Direction créative.

Les quatre ressources (un logo, trois polices) passent par les contrôles ZIP et
le stockage partagé dédupliqué. Les couleurs, logo et polices sont affichés dans
un aperçu propre à Branding, avec libération des URL Blob et des FontFace.
Les licences complètes des polices et les provenances sont conservées dans les
métadonnées des ressources, donc dans les ZIP exportés ; leur consultation est
repliable dans la médiathèque. Les rôles de couleur supplémentaires sont éditables.

Un défaut de chargement du catalogue est explicite et laisse l’édition manuelle
accessible. Une police indisponible dans le spécimen est signalée, sans la faire
passer silencieusement pour la police officielle.

## Préparation reproductible des ressources

`npm run branding:prepare` télécharge les sources au commit figé, contrôle les
SHA-256 du manifeste source, vérifie les blobs Git des licences et décompresse
la source Inter sans modifier le dépôt d’origine. Les empreintes des octets
réellement embarqués sont recalculées. Les contrôles existants de signature MIME,
taille, chemins et intégrité de `exportZIP` restent appliqués.

Les archives locales claire/sombre sont générées dans
`public/branding/flowtherapy-website/`, sans dépendance supplémentaire. Elles sont
préparées automatiquement avant `npm run dev` et `npm run build`. Le cache
`.cache/website-branding/` est revalidé avant réutilisation ; cache et sorties sont
ignorés par Git. Un premier build nécessite l’accès à GitHub. Une empreinte
incorrecte ou une ressource indisponible fait échouer le build : pas de faux
préréglage incomplet publié.

Le navigateur charge ensuite les ZIP depuis **le même site statique**, y compris
avec le préfixe GitHub Pages. Il ne contacte ni GitHub, ni Google Fonts, ni le site
public Flow Therapy à l’exécution. Après sauvegarde, les ressources sont locales
à IndexedDB. Cela n’installe pas un service worker et ne promet pas le rechargement
hors connexion du studio entier.

## Périmètre et limites

Ce complément configure le référentiel de marque et son aperçu. Il ne remplace
pas les harmonies expérimentales du laboratoire et ne prétend pas que les
**templates de campagne** rendent déjà automatiquement tous ces rôles. La scène
résolue et les exports PNG/JPEG/PDF restent dans leurs jalons respectifs.

Les alpagas, filigrane urbain et ornements à la craie sont inventoriés comme
**références source**, non importés par ce préréglage. Aucun SVG n’est introduit
dans le format d’archive tant que le nettoyage SVG n’est pas implémenté. Les photos
et événements réels du site ne sont pas importés dans les fixtures.

Le manifeste du site ne constitue pas une licence générale de redistribution
pour ses illustrations. Le logo est limité à l’usage Flow Therapy ; les fontes
conservent leurs licences OFL. Le renouvellement du commit source et de ses
empreintes est une modification de catalogue volontaire, à tester et relire.

## Vérification

Tests de domaine : palette, correspondances de rôles, références requises,
ressources incompatibles/dupliquées, isolation et sérialisation des instantanés.
Tests Chromium : chargement effectif du logo et des polices, aucune requête
externe, conservation d’une identité personnalisée même sans catalogue,
confirmation/remplacement sombre et repli utilisable sur erreur.

Exécuter `npm run check`, puis `npm run test:e2e`. Aucun changement de schéma de
campagne, d’identité ou de base IndexedDB n’est nécessaire.
