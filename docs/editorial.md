# Éditorial et médiathèque locale — 0.3.0-alpha.3

## Parcours livré

**Éditorial > Contenus** permet de rédiger des articles, annonces, présentations et
événements autonomes. Titre, résumé, corps, thèmes et statut sont enregistrés dans
IndexedDB. Un événement ajoute date civile et lieu. Les statuts sont Brouillon,
Prêt et Archivé ; **Prêt n'effectue aucune publication**. Un brouillon d'événement
peut conserver une date/lieu vide, mais une date renseignée doit être valide et
les deux champs sont exigés pour Prêt. Un titre est requis à l'enregistrement.

Le corps utilise un sous-ensemble Markdown : paragraphes, titres, listes simples,
gras et italique. Les boutons insèrent ces marqueurs dans la sélection ; l'aperçu
les interprète en éléments React sans HTML arbitraire ni téléchargement externe.
Ce n'est pas un éditeur riche WYSIWYG. Liens, tableaux, HTML, médias intégrés et
collaboration temps réel ne sont pas pris en charge. Les caractères HTML restent
du texte inerte. Le corps complet, avec ses marqueurs, est conservé dans le document.

Les images sont associées depuis la médiathèque, pas collées dans le corps. Une
association référence un fichier avec sa provenance, ses droits et son crédit.
Dissocier une image ne supprime pas le fichier partagé. Les changements de type
qui retireraient date/lieu nécessitent confirmation. Les changements de contenu,
rechargements et importations demandent confirmation si le brouillon est modifié.
La navigation entre tiroirs conserve le brouillon ; le rechargement de page ne le
sauvegarde pas automatiquement et déclenche l'avertissement du navigateur.

**Éditorial > Médiathèque** fournit miniatures PNG/JPEG, recherche sans distinction
d'accents (nom/crédit/droits), filtre images/polices, pagination par douze ressources,
import et édition des informations. Les URL Blob sont libérées au démontage.
Les métadonnées sont modifiées avec contrôle de concurrence ; les instantanés déjà
utilisés dans des articles/campagnes ne sont pas réécrits. Les fichiers identiques
sont dédupliqués et gardent les métadonnées de la ressource existante.
Un support actif permet **Insérer … dans le support** pour une image, en plus du
parcours d'insertion existant depuis Campagnes. Aucun SVG, audio ou vidéo ajouté.

## Sélection dans une campagne

Depuis un contenu enregistré : **Ajouter ce contenu à la campagne**. Depuis
Campagnes : rechercher/choisir un contenu puis **Sélectionner le contenu**.
Chaque sélection copie une révision identifiée du document et associe ses ressources
sans dupliquer les octets. Le texte n'est pas ressaisi ni agrégé en JSON opaque.
La campagne porte une liste ordonnée `editorial: EditorialDocument[]` ; le catalogue
éditorial n'est jamais une dépendance mutable de son rendu. Les copies sont incluses
dans JSON/ZIP et restent utilisables indépendamment de la bibliothèque d'origine.

Les contenus archivés ne peuvent plus être sélectionnés, mais leurs copies existantes
restent dans les campagnes. Une deuxième sélection du même identifiant est refusée :
la mise à jour d'un instantané n'est pas automatique. Pour reprendre une autre révision,
retirer d'abord les liaisons concernées et la copie puis sélectionner à nouveau.
Une future mise à jour explicite avec comparaison de révisions reste à concevoir.

Le panneau **Contenus utilisés par ce support** associe les champs du template aux
sources compatibles : titre, résumé, corps en texte, images ou collections d'événements.
Le pool est dérivé par `campaignContent` ; les scalaires ne sont pas copiés en double
dans `Campaign.content`. Les clés `editorial:<id encodé>:<champ>` sont explicites et
stables. Les collisions sont refusées. La projection du corps retire uniquement les
marqueurs Markdown pris en charge ; l'original reste dans l'instantané. Le moteur de
scène actuel reste textuel et ne rend pas cette mise en forme riche.

Les événements complets sélectionnés forment aussi `editorial:events`, dans l'ordre
de sélection. L'Agenda utilise cette collection lors de son activation si la liste
manuelle est vide. Les événements saisis manuellement ne sont ni remplacés ni fusionnés
silencieusement. Les sélections explicites d'événements restent prioritaires.
Changer une liaison demande confirmation avant d'effacer override/sélection locale.
Retirer un contenu encore référencé est refusé, même si un override masque la liaison.

Un template **Note éditoriale — prototype** expose titre et corps dans les cinq formats
existants. À l'activation il utilise le premier article/annonce/présentation sélectionné
(ou le premier événement à défaut). Le panneau de liaisons permet notamment de choisir
le résumé plutôt que le corps complet. Les articles trop longs ne sont pas tronqués :
ils débordent avec avertissement. Ce template est un prototype de parcours, pas une
affiche artistique ni un moteur de pagination d'articles longs.

## Stockage, versions et sauvegardes

`EditorialDocument` v1 et ses validations restent dans le domaine, sans React/cloud.
`saveEditorial` contrôle la révision attendue et l'existence des ressources/fichiers
dans une transaction. Les conflits conservent le brouillon avec options Recharger et
Enregistrer une copie. Le stockage IndexedDB v3 ajoute `editorial` et migre les
campagnes/identités existantes sans changer leurs révisions, fichiers ou références
manquantes. Les mises à niveau v1→v3 et v2→v3 sont testées.

**Le format de campagne passe de v2 à v3** pour ses instantanés éditoriaux. La migration
v2→v3 est explicite, sur copie, sans remplir artificiellement la sélection. L'identité
Brand reste v2 ; formats et templates restent v1 ; l'archive ZIP STORE reste v1.
Un ancien studio qui ne connaît pas la campagne v3 doit refuser ses fichiers.
Les archives/documents v1/v2 existants restent importables via les migrations.

**Exporter le contenu ZIP** sauvegarde un seul contenu (y compris un brouillon valide)
et ses images. Restaurer crée un nouveau document local, sans écraser l'original.
**Exporter la médiathèque ZIP** sauvegarde toutes les ressources, même si la recherche
les masque. Restaurer les ressources ajoute les fichiers sans importer les campagnes
ou articles contenus dans l'archive. Les types, chemins, tailles et SHA-256 sont
contrôlés avant ingestion. L'import d'un ensemble de ressources est séquentiel : en
cas d'erreur de stockage, les ressources déjà importées restent dans la médiathèque ;
réimporter réutilise ces fichiers. Une sauvegarde globale de tous les articles avec
la médiathèque en une action n'est pas encore livrée.

Limites conservées des archives : voir archive-format.md. Documents éditoriaux : titre
500 caractères, résumé 10 000, corps 200 000, document sérialisé 1 Mio au maximum.
Aucun champ n'est raccourci pour satisfaire ces limites : l'enregistrement est refusé.
Les erreurs d'accès ou de quota sont affichées. L'effacement du navigateur efface
les données ; exporter régulièrement. Aucun service distant, compte groupe ou Supabase
n'est activé, et aucun article n'est envoyé au site public ou aux réseaux sociaux.

## Suite

Ligne éditoriale éditable, documents audio/vidéo/PDF, classement avancé, suppression
contrôlée des ressources, actualisation comparée des instantanés, sauvegarde groupée,
éditeur riche, pagination d'articles et publication restent à développer.
La composition concert illustrée et les exports graphiques restent des tranches
séparées. L'onglet Médias complet n'est pas encore activé.
