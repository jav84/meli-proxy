#!/usr/bin/env bash

#runs 6 redis containers with the cluuster configuration

for ind in `seq 1 6`; do \
 docker run -d \
 -v $PWD/cluster-config.conf:/usr/local/etc/redis/redis.conf \
 --name "redis-$ind" \
 --net meli-challenge-network \
 redis redis-server /usr/local/etc/redis/redis.conf; \
done

#for each container runs cluster mode with 1 master 1 replica (on 6 containers will run 3 masters and 3 replicas)

REDIS_NODES="$(for ind in `seq 1 6`; do \
  echo -n "$(docker inspect -f \
  '{{(index .NetworkSettings.Networks "meli-challenge-network").IPAddress}}' \
  "redis-$ind")"':6379 '; \
  done)"

echo $REDIS_NODES

echo 'yes' | docker run -i --rm --net meli-challenge-network redis redis-cli --cluster create $REDIS_NODES --cluster-replicas 1
