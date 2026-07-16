FROM maven:3.9.11-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

COPY pom.xml ./pom.xml
COPY reports-service/pom.xml ./reports-service/pom.xml
COPY reports-service/src ./reports-service/src
RUN mvn -f reports-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-alpine
WORKDIR /app
COPY --from=builder /workspace/reports-service/target/*.jar app.jar
EXPOSE 8091
ENTRYPOINT ["java", "-jar", "app.jar"]
