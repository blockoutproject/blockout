# Blockout

Blockout is an Nx monorepo that keeps each application on its native toolchain.

- Java backend applications use Maven.
- The mobile application uses Expo.
- Python scrapers use Python 3.12 and their own runtime dependencies.
- Local databases and shared dependencies use Docker Compose.

The repository is currently being rebuilt from the existing standalone Blockout applications under `BOOT-001`.
