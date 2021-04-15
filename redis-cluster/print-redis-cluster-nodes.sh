#!/usr/bin/env bash

REDIS_NODES="$(for ind in `seq 1 6`; do \
  echo -n "$(docker inspect -f \
  '{{(index .NetworkSettings.Networks "meli-challenge-network").IPAddress}}' \
  "redis-$ind")"':6379 '; \
  done)"

echo $REDIS_NODES

