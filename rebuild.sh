#!/bin/bash
docker-compose down
docker rm -f certify-nft-be 2>/dev/null
docker-compose up --build -d