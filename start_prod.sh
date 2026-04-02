#!/bin/bash

set -e

sudo -E PATH=$PATH SUDO_UID=0 bash -c "cd ../ixp-digital-twin/ && .venv/bin/python3 deploy_external_link.py"
docker compose -f docker-compose.yml up -d --build
