#!/bin/bash

set -e

# 1. Remove conda environment if it exists
echo "Removing conda environment 'az-bundle' if it exists..."
conda env remove -n az-bundle -y || echo "Conda environment 'az-bundle' does not exist."

# 2. Create new environment with Python 3.12 and activate it
echo "Creating new conda environment 'az-bundle' with Python 3.12..."
conda create -n az-bundle python=3.12 -y
if [ $? -ne 0 ]; then
    echo "Error creating conda environment."
    exit 1
fi

echo "Activating conda environment 'az-bundle'..."
source $(conda info --base)/etc/profile.d/conda.sh
conda activate az-bundle
if [ $? -ne 0 ]; then
    echo "Error activating conda environment."
    exit 1
fi

# 3. Purge folder ./syno-ai (retry mechanism in case of failure)
if [ -d "syno-ai" ]; then
    echo "Deleting syno-ai folder..."
    rm -rf syno-ai
    if [ -d "syno-ai" ]; then
        echo "Error: Unable to delete syno-ai folder, retrying..."
        sleep 3
        rm -rf syno-ai
    fi
    if [ -d "syno-ai" ]; then
        echo "Error: Failed to purge syno-ai folder after retry."
        exit 1
    fi
fi

# 4. Clone the repository (development branch)
echo "Cloning the repository (testing branch)..."
git clone --branch testing https://github.com/synotechai/syno-ai syno-ai
if [ $? -ne 0 ]; then
    echo "Error cloning the repository."
    exit 1
fi

# 5. Change directory to syno-ai
cd syno-ai || { echo "Error changing directory"; exit 1; }

# 6. Install requirements
echo "Installing requirements from requirements.txt..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error installing requirements."
    exit 1
fi

# 7. Install specific version of pefile
# skip

# 8. Run bundle.py
echo "Running bundle.py..."
python ./bundle/bundle.py
if [ $? -ne 0 ]; then
    echo "Error running bundle.py."
    exit 1
fi

echo "Script completed."
