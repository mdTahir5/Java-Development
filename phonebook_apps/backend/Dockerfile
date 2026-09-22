# =============================================================================
# Phonebook API - production container image
#
# Render cannot run Java/Kotlin on a native runtime, so this Dockerfile is the
# build definition used by render.yaml (runtime: docker).
#
#   Build:  docker build -t phonebook-backend ./backend
#   Run:    docker run --rm -p 8080:8080 --env-file backend/.env.local phonebook-backend
#           (the local .env.local overrides the production values for testing)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: compile the executable jar
# ---------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build

# Dependencies are resolved first so source-only changes reuse the cache layer.
COPY pom.xml ./
RUN mvn -B -ntp -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -ntp -DskipTests package \
 && cp target/phonebook-backend-*.jar /build/app.jar

# Optional hardened TLS: when backend/certs/aiven-ca.pem is present (Aiven CA
# certificate, public material, see certs/README.md) a PKCS12 truststore is
# generated so DB_SSL_MODE=VERIFY_IDENTITY can be used. The runtime directory is
# always created so the COPY below succeeds either way.
ARG TRUSTSTORE_PASSWORD=changeit
COPY certs ./certs
RUN mkdir -p /build/runtime-certs \
 && if [ -f /build/certs/aiven-ca.pem ]; then \
      echo "Aiven CA certificate found - building PKCS12 truststore"; \
      "$JAVA_HOME/bin/keytool" -importcert -noprompt -alias aiven-ca \
        -file /build/certs/aiven-ca.pem \
        -keystore /build/runtime-certs/aiven-truststore.p12 \
        -storetype PKCS12 -storepass "${TRUSTSTORE_PASSWORD}"; \
    else \
      echo "No certs/aiven-ca.pem - skipping truststore (DB_SSL_MODE=REQUIRED will be used)"; \
    fi

# ---------------------------------------------------------------------------
# Stage 2: minimal runtime image
# ---------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy AS runtime

# curl is used by the container HEALTHCHECK below (Render itself uses
# healthCheckPath: /api/health from render.yaml).
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/*

# Never run the application as root.
RUN groupadd --system --gid 1001 phonebook \
 && useradd --system --uid 1001 --gid phonebook --create-home phonebook

WORKDIR /app
COPY --from=builder /build/app.jar /app/app.jar
COPY --from=builder /build/runtime-certs/ /app/certs/
RUN chown -R phonebook:phonebook /app

USER phonebook

# Render injects PORT (default 10000); 8080 is only a local fallback.
EXPOSE 8080

# Container-aware JVM settings: honour the platform memory limit (a Render free
# instance has 512 MB) and keep the GC footprint small.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Dfile.encoding=UTF-8"

# For local `docker run`; Render uses healthCheckPath from render.yaml instead.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-8080}/api/health" || exit 1

# SPRING_PROFILES_ACTIVE is supplied by the platform (render.yaml sets "prod").
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
