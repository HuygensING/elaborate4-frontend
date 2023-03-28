#!/bin/bash

echo "[1/2] cleaning public/ ..."
rm -rf public/*
echo

echo "[2/2] building apps/work-environment ..."
(cd apps/work-environment && npm run dist)
cp -r static public/work-environment
echo
