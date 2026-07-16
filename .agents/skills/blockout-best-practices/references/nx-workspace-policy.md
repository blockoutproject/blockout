# Nx Workspace Policy

- Keep deployables under `apps/**`, shared libraries under `libs/**`, infrastructure under `infra/**`, and scripts
  under `tools/**`.
- Java projects are inferred through `@nx/maven`.
- Expo is inferred through `@nx/expo/plugin`.
- Scrapers use explicit `project.json` targets.
- Local Compose files stay outside the Nx project graph, matching Maaatch.
- Prefer Nx targets as the stable developer and CI entrypoint; commands inside targets may call Maven, Python, Docker,
  or Expo.
- Project names use `@blockout/*` for JavaScript/manual projects and Maven coordinates for inferred Java modules.
- Keep target working directories explicit and repository-relative.
- Inspect `nx show projects` and the affected project configuration after structural changes.
