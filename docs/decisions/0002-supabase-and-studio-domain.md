# ADR 0002 — Supabase optionnel et domaine du studio

Statut : accepté le 11 septembre 2026 ; mise en œuvre prévue au jalon 0.6.

## Décision

- Le frontal reste une application statique et sera exposé à terme sous
  `studio.flowtherapymusic.com`.
- Supabase est la cible retenue pour la persistance partagée optionnelle : PostgreSQL,
  authentification, Row Level Security et stockage privé des ressources.
- Le navigateur n'utilisera qu'une clé publiable avec des politiques RLS. Une clé
  de service ou d'administration ne doit jamais être embarquée dans le build statique.
- L'adaptateur distant respectera le contrat de révision de `CampaignStore`.
  IndexedDB et les sauvegardes JSON/ZIP restent utilisables sans Supabase.
- Les campagnes demeurent des documents JSON versionnés ; les événements ne sont
  pas imposés comme table indépendante tant qu'un besoin de requête partagé ne le justifie pas.

## Exploitation du forfait gratuit

Une GitHub Action planifiée pourra exécuter une maintenance réelle et vérifiable
(contrôle d'intégrité ou purge d'éléments archivés) si les règles du forfait en
vigueur le rendent utile. Aucun faux trafic ni requête vide ne sera ajouté uniquement
pour simuler de l'activité. La fréquence, le mécanisme d'inactivité et les droits du
jeton devront être vérifiés dans la documentation Supabase au moment du jalon 0.6.

## Conséquences

Le choix ne crée aucune dépendance Supabase dans le domaine. La configuration du
sous-domaine, l'authentification, les tables, politiques RLS et buckets privés sont
différés au jalon 0.6 et feront l'objet d'une recette distincte avant activation.
