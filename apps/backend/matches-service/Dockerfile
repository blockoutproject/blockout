# Build from the repository root:
# docker build -f apps/backend/matches-service/Dockerfile .
FROM maven:3.9.14-eclipse-temurin-25-alpine AS builder
WORKDIR /workspace
COPY apps/backend/pom.xml apps/backend/pom.xml
COPY apps/backend/shared-models/pom.xml apps/backend/shared-models/pom.xml
COPY libs/shared/contracts/generated/specs libs/shared/contracts/generated/specs
COPY apps/backend/matches-service/pom.xml apps/backend/matches-service/pom.xml
COPY apps/backend/matches-service/src apps/backend/matches-service/src
RUN --mount=type=cache,target=/root/.m2 mvn -f apps/backend/pom.xml -N install -DskipTests \
    && mvn -f apps/backend/shared-models/pom.xml install -DskipTests \
    && mvn -f apps/backend/matches-service/pom.xml package -DskipTests

FROM eclipse-temurin:25-alpine
WORKDIR /app
COPY --from=builder /workspace/apps/backend/matches-service/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
