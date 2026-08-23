FROM redgate/flyway:12.4.0

COPY apps/backend/matches-service/src/main/resources/db/migration /flyway/sql

CMD ["migrate"]
