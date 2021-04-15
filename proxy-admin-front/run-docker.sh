#!/usr/bin/env bash
docker run -d --name proxy-admin-front -p 8082:80 --net meli-challenge-network proxy-admin-front