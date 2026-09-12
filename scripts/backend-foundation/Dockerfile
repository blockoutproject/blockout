FROM node:24-alpine AS contracts
WORKDIR /workspace
COPY libs/shared/contracts/specs libs/shared/contracts/specs
RUN node libs/shared/contracts/specs/scripts/bundle-openapi.mjs

FROM maven:3.9.14-eclipse-temurin-25-alpine AS build
ARG BACKEND_APP
WORKDIR /workspace
COPY apps/backend apps/backend
COPY --from=contracts /workspace/libs/shared/contracts/generated/specs/core.json libs/shared/contracts/generated/specs/core.json
RUN mvn -B -f apps/backend/pom.xml -pl ${BACKEND_APP} -am package -DskipTests -Dmaven.test.skip=true
RUN cp apps/backend/${BACKEND_APP}/target/${BACKEND_APP}-0.0.1-SNAPSHOT.jar /app.jar
FROM eclipse-temurin:25-jre-alpine
ARG APP_REVISION
LABEL org.opencontainers.image.revision=$APP_REVISION
ENV APP_REVISION=$APP_REVISION JAVA_TOOL_OPTIONS="-Duser.timezone=UTC -XX:MaxRAMPercentage=70"
RUN addgroup -S blockout && adduser -S -G blockout blockout
WORKDIR /app
COPY --from=build --chown=blockout:blockout /app.jar /app/app.jar
USER blockout
EXPOSE 8080 9090
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
