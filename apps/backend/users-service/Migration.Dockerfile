FROM redgate/flyway:12.4.0

COPY apps/backend/users-service/src/main/resources/db/migration /flyway/sql

CMD ["migrate"]
