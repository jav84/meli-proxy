#!/usr/bin/env bash
docker run -d --name proxy-admin -p 8081:3001 --net meli-challenge-network proxy-admin