FROM maven:3.9.11-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

COPY pom.xml ./pom.xml
COPY config-service/pom.xml ./config-service/pom.xml
COPY config-service/src ./config-service/src
RUN mvn -f config-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-alpine
WORKDIR /app
COPY --from=builder /workspace/config-service/target/*.jar app.jar
EXPOSE 8090
ENTRYPOINT ["java", "-jar", "app.jar"]
