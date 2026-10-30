#!/bin/bash
# Idempotente: si el esquema `aa` ya existe no toca nada, para que un
# `docker compose up` repetido no borre ni duplique datos.
set -euo pipefail

sql() {
  # -f 65001: los catálogos llevan tildes; sin UTF-8 las claves no coinciden.
  /opt/mssql-tools18/bin/sqlcmd -S sqlserver -U sa -P "$MSSQL_SA_PASSWORD" -C -b -f 65001 "$@"
}

sql -Q "IF DB_ID(N'$MSSQL_BASE') IS NULL CREATE DATABASE [$MSSQL_BASE] COLLATE Modern_Spanish_CI_AS;"

existe=$(sql -d "$MSSQL_BASE" -h -1 -W -Q "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.schemas WHERE name = 'aa';" | tr -d '[:space:]')

if [ "$existe" = "0" ]; then
  echo "Cargando esquema y semilla en $MSSQL_BASE…"
  sql -d "$MSSQL_BASE" -i /db/esquema.sql
  sql -d "$MSSQL_BASE" -i /db/semilla.sql
  echo "Base lista."
else
  echo "El esquema aa ya existe en $MSSQL_BASE; no se toca."
fi
