# syntax=docker/dockerfile:1

FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS contracts
WORKDIR /workspace
COPY package.json package-lock.json .npmrc ./
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm install --global npm@12.0.1 \
  && npm ci --workspaces=false --ignore-scripts --no-audit --no-fund
COPY .redocly.yaml ./
COPY contracts/http contracts/http
RUN npm run bundle:contracts

FROM --platform=$BUILDPLATFORM eclipse-temurin:25-jdk-noble AS build
# The wrapper verifies its ZIP checksum, so it needs unzip instead of its tar.gz fallback.
# The wrapper prefers wget, which can retry transient HTTP responses for the pinned ZIP.
RUN apt-get update \
  && apt-get install --yes --no-install-recommends unzip wget \
  && printf '%s\n' 'tries = 3' 'retry_on_http_error = 404,410,429' >> /etc/wgetrc \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY .mvn .mvn
COPY --chmod=755 mvnw ./
COPY pom.xml checkstyle.xml ./
COPY apps/backend/pom.xml apps/backend/pom.xml
COPY apps/collector apps/collector
COPY --from=contracts /workspace/contracts/http/.generated contracts/http/.generated
RUN ./mvnw -B -ntp -pl apps/collector package -DskipTests

FROM eclipse-temurin:25-jre-noble AS runtime
RUN useradd --create-home --uid 10001 blockout
WORKDIR /app
COPY --from=build /workspace/apps/collector/target/collector-0.0.0-SNAPSHOT.jar app.jar
USER blockout
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
