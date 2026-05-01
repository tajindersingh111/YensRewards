#!/bin/bash
set -e
npm install
# IMPORTANT: Do NOT use --force here. The --force flag can drop and recreate
# tables when schema changes are detected, which destroys all data in those tables.
# If a schema push fails due to breaking changes, handle it manually.
npm run db:push
