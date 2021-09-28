#!/usr/bin/env sh
set -e
set -- node "/app/dist/" "$@"
exec "$@"
