#!/usr/bin/env bash
docker run -d --name balancer -e DEFAULT_HOST=localhost -p 8080:80 --net meli-challenge-network -v /var/run/docker.sock:/tmp/docker.sock:ro nginxproxy/nginx-proxy
