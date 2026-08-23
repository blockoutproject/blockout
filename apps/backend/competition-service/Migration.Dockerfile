FROM redgate/flyway:12.4.0

COPY apps/backend/competition-service/src/main/resources/db/migration /flyway/sql

CMD ["migrate"]
