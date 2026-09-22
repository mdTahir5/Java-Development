-- ===========================================================================
-- Phonebook schema for Aiven for MySQL (optional, "strict schema mode")
-- ---------------------------------------------------------------------------
-- The default production setting (JPA_DDL_AUTO=update) lets Hibernate create
-- these tables automatically on the first deploy. Use this script when you
-- prefer the database schema to be managed explicitly:
--
--   1. Aiven Console > MySQL service > Databases > create "phonebook_db"
--      (or connect with the mysql CLI:  CREATE DATABASE phonebook_db;)
--   2. mysql -h <DB_HOST> -P <DB_PORT> -u avnadmin -p phonebook_db < db/schema.sql
--   3. Set JPA_DDL_AUTO=validate on Render and redeploy.
--
-- Column definitions mirror the JPA entities in
-- backend/src/main/java/com/phonebook/model (Hibernate 6, MySQL dialect).
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS phonebook_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE phonebook_db;

CREATE TABLE IF NOT EXISTS users (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    updated_at DATETIME(6)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS contacts (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NULL,
    phone      VARCHAR(255) NOT NULL,
    address    VARCHAR(500) NULL,
    user_id    BIGINT       NOT NULL,
    created_at DATETIME(6)  NOT NULL,
    updated_at DATETIME(6)  NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_contacts_user_id (user_id),
    INDEX idx_contacts_created_at (created_at)
) ENGINE = InnoDB;
