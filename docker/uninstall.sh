#!/bin/bash

docker rm -f nexent
docker rm -f nexent-postgresql
docker rm -f nexent-minio
docker rm -f nexent-elasticsearch
docker rm -f nexent-data-process
docker rm -f nexent-web
docker network rm nexent_nexent