#!/usr/bin/env bash
docker run -d --name proxy1 -p 8085:3000 -e VIRTUAL_HOST=localhost --expose 3000 --net meli-challenge-network proxy
docker run -d --name proxy2 -p 8086:3000 -e VIRTUAL_HOST=localhost --expose 3000 --net meli-challenge-network proxy
docker run -d --name proxy3 -p 8087:3000 -e VIRTUAL_HOST=localhost --expose 3000 --net meli-challenge-network proxy
docker run -d --name proxy4 -p 8088:3000 -e VIRTUAL_HOST=localhost --expose 3000 --net meli-challenge-network proxy
docker run -d --name proxy5 -p 8089:3000 -e VIRTUAL_HOST=localhost --expose 3000 --net meli-challenge-network proxy

