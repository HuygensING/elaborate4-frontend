#!/bin/bash

rm -rf public/*

(cd apps/work-environment; npm run dist)
cp -r static public/work-environment

(cd apps/publication; npm run dist)
cp -r static public/publication

(cd apps/boschdoc; npm run dist)

tar -cvpzf elaborate4-frontend.tgz public/
