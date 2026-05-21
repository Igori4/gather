#!/bin/bash
set -e

# Creates the auth-app database alongside the main gather_dev database.
# Runs automatically on first postgres container start (init scripts are skipped
# if the data volume already exists — delete the volume to re-run).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE gather_auth;
    GRANT ALL PRIVILEGES ON DATABASE gather_auth TO $POSTGRES_USER;
EOSQL
