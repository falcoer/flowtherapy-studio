# Produit et parcours

Objectif : un private Canva ciblé pour Flow Therapy, sobre, rapide et cohérent.
L'IA peut fournir des assets importés ; aucun appel payant n'est requis pour éditer.

## Campagne

Créer/dupliquer une campagne ; saisir les informations communes et une table
date/libellé/lieu. Ajouter, dupliquer, supprimer, déplacer des événements ; tri
chronologique explicite. Chaque ligne conserve son identifiant. Une date civile
ne subit pas de conversion de fuseau.

Activer des supports (annonce, rappel, remerciement), sélectionner un template et
les variantes. Un support lie les champs du template au contenu de campagne et
peut choisir toute la collection ou une liste d'identifiants dans un ordre explicite.
Une référence supprimée déclenche une erreur visible, jamais une omission silencieuse.

## Interface

Liste des supports à gauche, canvas central, propriétés à droite ; onglets par
format et vue d'ensemble. Afficher la portée des modifications : campagne,
support ou déclinaison. Valeurs héritées/personnalisées identifiées et réinitialisables.
Déplacement, redimensionnement, recadrage, ordre, visibilité, verrouillage,
guides et undo/redo. Autosauvegarde locale avec état visible.

## Catalogue

Éditeur de templates distinct de l'édition de campagne. Champs et styles partagés,
géométries explicites par format. Matrice des variantes : brouillon/validée/absente.
L'adaptation d'un nouveau format est une proposition à vérifier. Un réglage JPEG
au lieu de PNG ne crée pas une nouvelle variante.

Personnaliser par copie autonome avec provenance ; exporter une contribution
pour intégration au catalogue GitHub par PR. Les anciennes campagnes ne changent pas.

## Collections

Même collection affichable en tableau, liste ou cartes. Mise en page du template
définit compactage borné, erreur ou pagination. Chaque page est prévisualisable.
Exporter toutes les pages en images ou PDF multipage. Aucun débordement masqué.

## Hors première version

Coédition temps réel, marketplace, moteur de scripts utilisateur, PDF/X/CMJN garanti,
génération IA intégrée, connecteurs sociaux et programmation distante.
