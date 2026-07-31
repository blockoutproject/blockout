# Build from the repository root:
# docker build -f apps/backend/competition-service/Dockerfile .
FROM maven:3.9.11-eclipse-temurin-25-alpine AS builder
WORKDIR /workspace
COPY apps/backend/pom.xml apps/backend/pom.xml
COPY apps/backend/shared-models/pom.xml apps/backend/shared-models/pom.xml
COPY libs/shared/contracts/generated/specs libs/shared/contracts/generated/specs
COPY apps/backend/competition-service/pom.xml apps/backend/competition-service/pom.xml
COPY apps/backend/competition-service/src apps/backend/competition-service/src
RUN --mount=type=cache,target=/root/.m2 mvn -f apps/backend/pom.xml -N install -DskipTests \
    && mvn -f apps/backend/shared-models/pom.xml install -DskipTests \
    && mvn -f apps/backend/competition-service/pom.xml package -DskipTests

FROM eclipse-temurin:25-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/backend/competition-service/target/*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
