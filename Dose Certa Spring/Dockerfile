# Estágio de build
FROM maven:3.9.6-eclipse-temurin-17-focal AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

# Estágio de execução
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copia o JAR do estágio de build
COPY --from=build /app/target/*.jar app.jar

# Expõe a porta que a aplicação vai rodar
EXPOSE 8080

# Comando para rodar a aplicação
ENTRYPOINT ["java", "-jar", "app.jar"]
