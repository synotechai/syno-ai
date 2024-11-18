#!/bin/bash

BRANCH="development"

git clone -b "$BRANCH" "https://github.com/synotechai/syno-ai" "/git/syno-ai"

# Create and activate Python virtual environment
python3 -m venv /opt/venv
source /opt/venv/bin/activate

# Ensure the virtual environment and pip setup
pip install --upgrade pip ipython requests

# Install some packages in specific variants
pip install torch --index-url https://download.pytorch.org/whl/cpu

# Install remaining A0 python packages
pip install -r /github/syno-ai/requirements.txt

# Preload A0
python /github/syno-ai/preload.py
