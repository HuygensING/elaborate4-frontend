#!/bin/bash

version=$(date +%Y.%m.%d)
for b in boschdoc publication work-environment; do
  tag="registry.diginfra.net/hi/elab4-$b-frontend:$version"
  echo "> building $tag ..."
  echo
  docker build -t $tag -f docker/$b/Dockerfile .
  echo
  docker images | grep elab4-$b-frontend
  echo
done
echo "done!"