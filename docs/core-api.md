# Noyau 0.1

Le noyau TypeScript ne dépend ni du DOM, ni de React, ni d'un service. Il emploie
`structuredClone`, `Intl.Locale`, `TextEncoder/TextDecoder` et Web Crypto SHA-256,
disponibles dans les navigateurs modernes en contexte sécurisé et Node >= 22.
Aucune interface graphique ni persistance IndexedDB n'est livrée par ce jalon.

## Validation et résolution

`src/domain/core.ts` expose :

- `validateCampaign`, `validateTemplate`, `validateFormat` : schéma puis invariants
  métier (identifiants, références, dates civiles, géométrie, types des bindings).
- `resolveSupport(campaign, supportId)` : valeurs de champs et placements de chaque
  variante active. Priorité override présent > binding > défaut. Une chaîne vide
  est une valeur explicite, y compris pour un champ obligatoire. Obligatoire signifie
  présent ; le futur éditeur pourra ajouter des contraintes de saisie.
- `selectEvents(events, selection)` : copie dans l'ordre enregistré ou demandé.
  Aucun tri implicite. Répétitions, suppressions et minItems non respecté bloquent.
- `createSupport({ id, name, template, formats, layoutIds, bindings })` : copies des
  définitions à la révision exacte ; seuls les formats activés sont nécessaires.
- `snapshotCampaign(campaign)` : copie détachée, gelée récursivement. Une révision
  du catalogue ne modifie jamais une campagne ou ses overrides existants.
- `campaignDirection` et `resolveSupportDirection` : direction commune rétrocompatible,
  puis overrides locaux autorisés par les capacités du template.
- `parseRecipe` : validation stricte des recettes v2 et migration explicite des
  anciennes recettes v1 ; `recipeToDirection` copie le préréglage dans une campagne.

Les erreurs sont des `DomainError` avec `code`, `path` et message. Les catégories
incluent SCHEMA, REFERENCE, VERSION, JSON, SIZE, ARCHIVE, ASSET et INTEGRITY.
Les validateurs ne corrigent ni ne retirent silencieusement les données.
Une clé inconnue est refusée. Les références de bindings supprimées sont signalées,
même lorsqu'un override masquerait actuellement leur valeur.

Un override de placement remplace chacune des propriétés fournies. `frame`, `style`,
`imageFit`, `textFit` et `eventPresentation` sont des valeurs complètes, jamais des
patches récursifs. Supprimer la propriété override rétablit celle du template.

`resolveSupport` ne produit pas encore une scène graphique : les tokens de charte
sont vérifiés, mais mesure du texte, résolution des polices, layout final,
pagination et interprétation graphique des calques restent aux jalons suivants.

## Schémas et versions

`schemas/domain.schema.json` contient les contrats JSON Schema draft-07 exportables.
Pointer par exemple vers `#/definitions/Campaign`, `#/definitions/Template` ou
`#/definitions/Format`. Génération à partir de `src/domain/model.ts` avec
`npm run schemas` ; `npm run check` détecte toute divergence.
Les invariants entre références et les dates civiles complètent ces schémas dans
le validateur métier ; un outil tiers doit également les appliquer.

La structure sérialisée reste `schemaVersion: 1`, également utilisée par le socle
0.0 : le numéro de version du logiciel n'est pas celui du document.
`migrateCampaign` conserve `original`, retourne une campagne copiée et les étapes.
Aucune version historique différente de 1 n'existe dans le dépôt, donc aucune
migration inventée n'est activée. Une ancienne version exige une migration explicite
et unique ; version future, sortie invalide ou saut incohérent sont refusés.

## Exemple d'utilisation

```ts
import { resolveSupport } from "../src/domain/core.js";
import { importJSON, exportJSON } from "../src/storage/json.js";
import { importZIP, exportZIP } from "../src/storage/archive.js";

const campaign = importJSON(jsonText);
const resolved = resolveSupport(campaign, campaign.supports[0].id);
const backup = exportJSON(campaign);
// Les clés sont les chemins assets/... déclarés dans campaign.assets.
const zip = await exportZIP(campaign, new Map()); // campagne sans assets uniquement
const restored = await importZIP(zip);
```

JSON transporte la campagne et les métadonnées des assets. Le ZIP transporte en
plus leurs octets ; voir [contrat d'archive](archive-format.md).
