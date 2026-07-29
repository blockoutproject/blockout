# GitHub Taxonomy Policy

Read this policy when assigning identifiers, Tracks, labels, or Workset areas. The repository router must select a
repository-owned taxonomy profile containing the exact catalog.

## Ownership

- Native issue type owns the kind of work.
- The Project owns Track, Priority, Execution Mode, and Status.
- The repository taxonomy profile owns Track identifiers, label names, colors, descriptions, and area-to-path
  mappings.
- Issues own the exact Workset required for their scope.

Do not encode lifecycle state, priority, or ownership in labels when the hosting platform already provides the owning
field.

## Identifiers

Use one stable identifier prefix per Track and allocate sequence numbers monotonically within that Track. Keep the
identifier in issue and pull-request titles and task commits; branches use the issue number because it is always
available from GitHub.

Never renumber delivered work to close gaps. A taxonomy migration must preserve historical identifiers or publish an
explicit mapping.

## Labels

- Use lowercase labels.
- Apply every area label required by `Workset.Areas`.
- Add only labels that materially describe the diff or review surface.
- Do not duplicate native issue type, Status, Priority, Track, or assignee as a label.
- Do not create a generic blocked label when the Project Status owns that state.
- Keep colors and descriptions stable in the repository taxonomy profile.

Pull requests should normally carry two to four useful labels. Issues may carry more area labels when their Workset
requires them.

## Workset Areas

Each area label must map to a clear repository boundary in the taxonomy profile. Areas describe ownership and routing;
write locks and external locks provide conflict authority.

- Area labels and read-only scope never create a write conflict.
- A change spanning several owned boundaries declares every affected area and lock.
- Generated consumers are included when a source change requires their regeneration.
- External systems use exact external locks when mutation is authorized.

## Catalog Changes

Treat taxonomy changes as Project governance work:

1. read the complete live Project schema and current label catalog;
2. identify every issue, pull request, Workset, view, and workflow affected;
3. define the target catalog and any historical mapping;
4. obtain explicit authorization before mutating Project structure or repository labels;
5. apply the smallest ordered migration;
6. reread all changed values and validate repository documentation.

Never infer a catalog change from a task implementation. Exact repository values belong only to the selected taxonomy
profile.
