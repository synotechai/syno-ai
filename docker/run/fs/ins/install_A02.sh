#!/bin/bash

# cachebuster script, this helps speed up docker builds
rm -rf /github/syno-ai

# run the original install script again
bash /ins/install_A0.sh

# remove python packages cache
source /opt/venv/bin/activate
pip cache purge