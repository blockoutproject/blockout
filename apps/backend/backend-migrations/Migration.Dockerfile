FROM maven:3.9.14-eclipse-temurin-25-alpine AS driver
RUN mvn -B dependency:copy -Dartifact=org.postgresql:postgresql:42.7.11 -DoutputDirectory=/driver
FROM liquibase/liquibase:5.0.3
ARG APP_REVISION
LABEL org.opencontainers.image.revision=$APP_REVISION
COPY --from=driver /driver/postgresql-42.7.11.jar /liquibase/lib/postgresql.jar
COPY apps/backend/backend-migrations/src/main/resources/db /liquibase/db
ENV LIQUIBASE_COMMAND_CHANGELOG_FILE=db/changelog/db.changelog-master.xml
CMD ["update"]
