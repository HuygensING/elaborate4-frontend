#!/bin/bash

echo "[1/2] cleaning public/ ..."
rm -rf public/*
echo

echo "[2/2] building apps/publication ..."
(cd apps/publication && npm run dist)
cp -r static public/publication
echo
