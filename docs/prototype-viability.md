# PROTO-01 — Viability mode

## Purpose

Flow Therapy Studio is temporarily operated in **prototype viability mode**.
The objective is not roadmap completeness. The objective is to prove that the
current domain model and rendering architecture can produce a real, publishable
Flow Therapy media asset from structured data without bypassing the Studio.

## Reference vertical slice

`Brand configuration → Library assets → Campaign → Events/content → Template → Creative direction → Resolved scene → Export`

The reference use case is a real Flow Therapy multi-concert poster using actual
brand tokens, fonts, photographs and alpaga assets.

## Success criteria

1. A structured brand value visibly propagates into the rendered media.
2. Real library assets can be selected and used by the composition.
3. Real campaign events feed the concert poster without duplicated manual entry.
4. Creative-direction controls produce visible variations rather than metadata only.
5. The result remains directly editable without breaking the underlying data model.
6. One campaign can produce at least square, story and A4 variants.
7. A real PNG file can be exported from the Studio.
8. The result is good enough to be considered for actual publication after normal visual adjustments.

The prototype fails structurally if reaching a publishable result requires rebuilding
the composition outside the Studio or bypassing the campaign/brand model.

## Scope rule

Only work that contributes to the reference vertical slice is in scope.

Temporarily deferred: shared persistence / Supabase, collaboration and authentication,
direct social publication, exhaustive template/format coverage, advanced administration,
brand-release workflows beyond what is required to demonstrate propagation, and
non-essential polish.

A minimal PNG export is explicitly brought forward from milestone 0.4 because a
prototype that cannot leave the Studio does not validate product viability.

## Validation classification

Every issue found while exercising the prototype is classified as one of:

- **Concept blocker** — the model or architecture prevents the desired workflow;
- **Prototype limitation** — the workflow works but a deliberately omitted capability is needed for production;
- **Polish** — usability or visual refinement that does not invalidate the concept.

## Exit decision

Continue toward the product roadmap if the structured model helps produce the target
media; revise the affected model if workarounds dominate; redesign if the Studio cannot
produce a usable asset without bypassing its own abstractions.
