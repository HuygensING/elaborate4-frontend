#!/bin/bash

# NPM link hilib
cd ./hilib
echo "developer" | sudo -S npm link

# Start tmuxinator
mux project