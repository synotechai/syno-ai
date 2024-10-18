@echo off
setlocal enabledelayedexpansion

:: Check if conda is recognized
where conda >nul 2>nul
if %errorlevel% neq 0 (
    echo Conda not found in PATH. Checking known location...

    set "CONDA_PATH=C:\Users\%USERNAME%\miniconda3"
    if exist "!CONDA_PATH!\Scripts\conda.exe" (
        echo Found Conda at !CONDA_PATH!
        set "PATH=!CONDA_PATH!;!CONDA_PATH!\Scripts;!CONDA_PATH!\Library\bin;%PATH%"
        echo Added Conda to PATH
    ) else (
        echo Conda installation not found at !CONDA_PATH!
        echo Please install Conda or add it to PATH manually.
        pause
        exit /b 1
    )
)

:: Verify conda is now accessible
where conda >nul 2>nul
if %errorlevel% neq 0 (
    echo Failed to add Conda to PATH. Please add it manually.
    pause
    exit /b 1
)

:: Initialize conda shell (if not done before)
call conda init bash >nul 2>nul
if %errorlevel% neq 0 (
    echo Error running 'conda init'. Please check your conda installation.
    pause
    exit /b 1
)

:: 1. Remove conda environment if it exists
conda env remove -n az-bundle -y 2>nul
if %errorlevel% neq 0 (
    echo Error removing conda environment
    pause
)

:: 2. Create new environment with Python 3.12 and activate it
conda create -n az-bundle python=3.12 -y
if %errorlevel% neq 0 (
    echo Error creating conda environment
    pause
) else (
    call conda.bat activate az-bundle
    if %errorlevel% neq 0 (
        echo Error activating conda environment
        pause
    )
)

:: 3. Purge folder ./syno-ai (retry mechanism in case of failure)
if exist syno-ai-git (
    echo Deleting syno-ai-git folder...
    rmdir /s /q syno-ai-git
    if exist syno-ai-git (
        echo Error: Unable to delete syno-ai-git folder, retrying...
        timeout /t 3 /nobreak >nul
        rmdir /s /q syno-ai-git
    )
    if exist syno-ai-git (
        echo Error: Failed to purge syno-ai-git folder after retry.
        pause
    )
)

:: 4. Clone the repository (development branch)
git clone --branch development https://github.com/synotechai/syno-ai syno-ai-git
if %ERRORLEVEL% neq 0 (
    echo Error cloning the repository
    pause
)

@REM :: 5. Change directory to syno-ai
@REM cd syno-ai
@REM if %errorlevel% neq 0 (
@REM     echo Error changing directory
@REM     pause
@REM )

:: 6. Install requirements
pip install -r ./syno-ai-git/requirements.txt
if %errorlevel% neq 0 (
    echo Error installing project requirements
    pause
)

pip install -r ./syno-ai-git/bundle/requirements.txt
if %errorlevel% neq 0 (
    echo Error installing bundle requirements
    pause
)

:: 7. Install specific version of pefile
pip install pefile==2023.2.7
if %errorlevel% neq 0 (
    echo Error installing pefile
    pause
)

:: 8. Run bundle.py
python ./syno-ai-git/bundle/bundle.py
if %errorlevel% neq 0 (
    echo Error running bundle.py
    pause
)

:: 9. Create Windows self-extracting archive with 7-Zip
echo Creating Windows self-extracting archive...
"C:\Program Files\7-Zip\7z.exe" a -sfx"C:\Program Files\7-Zip\7z.sfx" syno-ai-preinstalled-win-x86.exe ".\syno-ai-git\bundle\dist\syno-ai" -mx=7
if %errorlevel% neq 0 (
    echo Error creating Windows self-extracting archive.
    pause
)

echo Script completed
pause
