# Stage 1: Build JAR package
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN maven_opts="-XX:+TieredCompilation -XX:TieredStopAtLevel=1" mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests

# Stage 2: Minimal runtime JRE image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
