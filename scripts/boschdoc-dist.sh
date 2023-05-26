#!/bin/bash

echo "[1/2] cleaning public/ ..."
rm -rf public/*
echo

echo "[4/2] building apps/boschdoc ..."
(cd apps/boschdoc && cat .env)
#(cd apps/boschdoc && npm run dist)
echo
