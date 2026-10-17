FROM node:24-bookworm-slim AS contracts
WORKDIR /workspace
COPY package.json package-lock.json .redocly.yaml ./
COPY apps/mobile/package.json apps/mobile/package.json
RUN npm install --global npm@12.0.1 && npm ci --workspaces=false --ignore-scripts --no-audit --no-fund
COPY contracts/http contracts/http
RUN npm run bundle:contracts

FROM eclipse-temurin:25-jdk-noble AS build
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml checkstyle.xml ./
COPY apps/backend/pom.xml apps/backend/pom.xml
COPY apps/collector/pom.xml apps/collector/pom.xml
COPY --from=contracts /workspace/contracts/http/.generated contracts/http/.generated
COPY apps/collector/src apps/collector/src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp -pl apps/collector package -Dmaven.test.skip=true

FROM eclipse-temurin:25-jre-noble
WORKDIR /app
COPY --from=build --chown=10001:10001 /workspace/apps/collector/target/collector-*.jar app.jar
USER 10001:10001
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
