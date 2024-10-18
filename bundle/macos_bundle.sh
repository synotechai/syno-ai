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

# 3. Purge folder ./syno-ai-git (retry mechanism in case of failure)
if [ -d "syno-ai-git" ]; then
    echo "Deleting syno-ai-git folder..."
    rm -rf syno-ai-git
    if [ -d "syno-ai-git" ]; then
        echo "Error: Unable to delete syno-ai-git folder, retrying..."
        sleep 3
        rm -rf syno-ai-git
    fi
    if [ -d "syno-ai-git" ]; then
        echo "Error: Failed to purge syno-ai-git folder after retry."
        exit 1
    fi
fi

# 4. Clone the repository (development branch)
echo "Cloning the repository (development branch)..."
git clone --branch development https://github.com/synotechai/syno-ai syno-ai-git
if [ $? -ne 0 ]; then
    echo "Error cloning the repository."
    exit 1
fi

# 5. Change directory to syno-ai
# cd syno-ai || { echo "Error changing directory"; exit 1; }

# 6. Install requirements
echo "Installing requirements from requirements.txt..."
pip install -r ./syno-ai-git/requirements.txt
if [ $? -ne 0 ]; then
    echo "Error installing requirements."
    exit 1
fi

pip install -r ./syno-ai-git/bundle/requirements.txt
if [ $? -ne 0 ]; then
    echo "Error installing requirements."
    exit 1
fi

# 7. Install specific version of pefile
# skip

# 8. Run bundle.py
echo "Running bundle.py..."
python ./syno-ai-git/bundle/bundle.py
if [ $? -ne 0 ]; then
    echo "Error running bundle.py."
    exit 1
fi

# # 9. Move the generated 7z file to the script directory and remove syno-ai folder
# BUNDLE_FILE="bundle/dist/syno-ai.7z"
# if [ -f "$BUNDLE_FILE" ]; then
#     SCRIPT_DIR=$(dirname "$0")
#     echo "Moving $BUNDLE_FILE to $SCRIPT_DIR..."
#     mv "$BUNDLE_FILE" "$SCRIPT_DIR"
#     if [ $? -ne 0 ]; then
#         echo "Error moving $BUNDLE_FILE to $SCRIPT_DIR."
#         exit 1
#     fi
# else
#     echo "Error: $BUNDLE_FILE not found."
#     exit 1
# fi

# 9. Create macOS package
echo "Creating macOS package..."
pkgbuild --root ./syno-ai-git/bundle/dist/syno-ai \
         --identifier synotechai.syno-ai \
         --install-location "$HOME/Library/Application Support/syno-ai/install" \
         --scripts ./syno-ai-git/bundle/mac_pkg_scripts \
         --ownership preserve \
         syno-ai-preinstalled-mac-m1.pkg

if [ $? -ne 0 ]; then
    echo "Error creating macOS package."
    exit 1
fi

# 10. Remove the syno-ai-git folder
echo "Deleting syno-ai-git folder..."
cd ..
rm -rf syno-ai-git
if [ -d "syno-ai-git" ]; then
    echo "Error: Failed to delete syno-ai-git folder."
    exit 1
fi

echo "Script completed."
