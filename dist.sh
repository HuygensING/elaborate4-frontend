#!/bin/bash

echo "[1/5] cleaning public/ ..."
rm -rf public/*
echo

echo "[2/5] building apps/work-environment ..."
(cd apps/work-environment; npm run dist)
cp -r static public/work-environment
echo

echo "[3/5] building apps/publication ..."
(cd apps/publication; npm run dist)
cp -r static public/publication
echo

echo "[4/5] building apps/boschdoc ..."
(cd apps/boschdoc; npm run dist)
echo

echo "[5/5] bundling output to elaborate4-frontend.tgz ..."
tar -cvpzf elaborate4-frontend.tgz public/
echo
