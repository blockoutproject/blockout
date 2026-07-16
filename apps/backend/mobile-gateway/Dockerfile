FROM maven:3.9.11-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

COPY pom.xml ./pom.xml
COPY mobile-gateway/pom.xml ./mobile-gateway/pom.xml
COPY mobile-gateway/src ./mobile-gateway/src
RUN mvn -f mobile-gateway/pom.xml clean package -DskipTests

FROM eclipse-temurin:21-alpine
WORKDIR /app
COPY --from=builder /workspace/mobile-gateway/target/*.jar app.jar
EXPOSE 8089
ENTRYPOINT ["java", "-jar", "app.jar"]
