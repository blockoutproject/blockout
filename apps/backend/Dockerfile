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
RUN apt-get update \
  && apt-get install --yes --no-install-recommends unzip \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY .mvn .mvn
COPY --chmod=755 mvnw ./
COPY pom.xml checkstyle.xml ./
COPY apps/backend apps/backend
COPY apps/collector/pom.xml apps/collector/pom.xml
COPY infra/postgres/init-roles.sql infra/postgres/init-roles.sql
COPY --from=contracts /workspace/contracts/http/.generated contracts/http/.generated
RUN ./mvnw -B -ntp -pl apps/backend package -DskipTests

FROM build AS migration-dependencies
# Resolve the migration's own Maven inputs without connecting to a database.
RUN MAVEN_USER_HOME=/opt/migration-maven LIQUIBASE_URL=offline:postgresql \
  ./mvnw -B -ntp -Dmaven.repo.local=/opt/migration-maven/repository \
  -pl apps/backend liquibase:validate

FROM --platform=$BUILDPLATFORM debian:bookworm-slim AS github-cli
ARG TARGETARCH
RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && curl --fail --silent --show-error --location \
    "https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_linux_${TARGETARCH}.tar.gz" \
    --output /tmp/gh.tar.gz \
  && curl --fail --silent --show-error --location \
    https://github.com/cli/cli/releases/download/v2.102.0/gh_2.102.0_checksums.txt \
    --output /tmp/checksums.txt \
  && awk -v archive="gh_2.102.0_linux_${TARGETARCH}.tar.gz" \
    '$2 == archive { print $1 "  /tmp/gh.tar.gz" }' /tmp/checksums.txt > /tmp/selected-checksum.txt \
  && test -s /tmp/selected-checksum.txt \
  && sha256sum --check /tmp/selected-checksum.txt \
  && tar --extract --gzip --file /tmp/gh.tar.gz --directory /tmp \
  && cp "/tmp/gh_2.102.0_linux_${TARGETARCH}/bin/gh" /usr/local/bin/gh

FROM eclipse-temurin:25-jre-noble AS migrations
RUN useradd --create-home --uid 10001 blockout
WORKDIR /workspace
COPY --from=migration-dependencies --chown=blockout:blockout /opt/migration-maven /home/blockout/.m2
COPY --from=build --chown=blockout:blockout /workspace/.mvn .mvn
COPY --from=build --chown=blockout:blockout /workspace/mvnw /workspace/pom.xml ./
COPY --from=build --chown=blockout:blockout /workspace/apps/backend/pom.xml apps/backend/pom.xml
COPY --from=build --chown=blockout:blockout /workspace/apps/collector/pom.xml apps/collector/pom.xml
COPY --from=build --chown=blockout:blockout /workspace/apps/backend/src/main/resources/db apps/backend/src/main/resources/db
USER blockout
ENTRYPOINT ["./mvnw", "-B", "-ntp", "-pl", "apps/backend", "liquibase:update"]

FROM eclipse-temurin:25-jre-noble AS runtime
RUN useradd --create-home --uid 10001 blockout
WORKDIR /app
COPY --from=github-cli /usr/local/bin/gh /usr/local/bin/gh
COPY --from=build /workspace/apps/backend/target/backend-0.0.0-SNAPSHOT.jar app.jar
USER blockout
EXPOSE 8080
ENTRYPOINT ["java", "-Djava.awt.headless=true", "-jar", "/app/app.jar"]
