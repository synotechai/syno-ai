### Need updates from v0.7? 👉[How to update Syno AI](#how-to-update-syno-ai)

## Windows, macOS and Linux Setup Guide

### Prerequisites

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4GB | 8GB |
| Storage | 10GB | 10GB |
| CPU | 2 cores | 4 cores |
| Docker | Required | Required |
| Internet | Optional* | Required |

Note*: Offline operation requires prompt adjustments

1. **Install Docker Desktop:** 
- Docker Desktop provides the runtime environment for Syno AI, ensuring consistent behavior and security across platforms
- The entire framework runs within a Docker container, providing isolation and easy deployment
- Available as a user-friendly GUI application for all major operating systems

1.1. Go to the download page of Docker Desktop [here](https://www.docker.com/products/docker-desktop/). If the link does not work, just search the web for "docker desktop download".

1.2. Download the version for your operating system. For Windows users, the Intel/AMD version is the main download button.

<img src="res/setup/image-8.png" alt="docker download" width="200"/>
<br><br>

> [!NOTE]
> **Linux Users:** You can install either Docker Desktop or docker-ce (Community Edition). 
> For Docker Desktop, follow the instructions for your specific Linux distribution [here](https://docs.docker.com/desktop/install/linux-install/). 
> For docker-ce, follow the instructions [here](https://docs.docker.com/engine/install/).
>
> If you're using docker-ce, you'll need to add your user to the `docker` group:
> ```bash
> sudo usermod -aG docker $USER
> ```
> Log out and back in, then run:
> ```bash
> docker login
> ```

1.3. Run the installer with default settings. On macOS, drag and drop the application to your Applications folder.

<img src="res/setup/image-9.png" alt="docker install" width="300"/>
<img src="res/setup/image-10.png" alt="docker install" width="300"/>

<img src="res/setup/image-12.png" alt="docker install" width="300"/>
<br><br>

1.4. Once installed, launch Docker Desktop: 

<img src="res/setup/image-11.png" alt="docker installed" height="100"/>
<img src="res/setup/image-13.png" alt="docker installed" height="100"/>
<br><br>

1.5. Create a Docker Hub account when prompted and sign in. This is required to pull the Syno AI container image.

> [!IMPORTANT]  
> **macOS Configuration:** In Docker Desktop's preferences (Docker menu) → Settings → 
> Advanced, enable "Allow the default Docker socket to be used (requires password)."

![docker socket macOS](res/setup/macsocket.png)

2. **Run Syno AI:**

2.1. Pull the Syno AI Docker image:
- Search for `synotechai/syno-ai-run` in Docker Desktop
- Click the `Pull` button
- The image will be downloaded to your machine in a few minutes

![docker pull](res/setup/1-docker-image-search-updatedv2syno.png)

> [!TIP]
> Alternatively, run the following command in your terminal:
>
> ```bash
> docker pull synotechai/syno-ai-run
> ```

2.2. Create a data directory for persistence:
- Choose or create a directory on your machine where you want to store Syno AI's data
- This can be any location you prefer (e.g., `C:/syno-ai-data` or `/home/user/syno-ai-data`)
- This directory will contain all your Syno AI files, like the legacy root folder structure:
  - `/memory` - Agent's memory and learned information
  - `/knowledge` - Knowledge base
  - `/instruments` - Instruments and functions
  - `/prompts` - Prompt files
  - `/work_dir` - Working directory
  - `.env` - Your API keys
  - `settings.json` - Your Syno AI settings

> [!TIP]
> Choose a location that's easy to access and backup. All your Syno AI data 
> will be directly accessible in this directory.

2.3. Run the container:
- In Docker Desktop, go back to the "Images" tab
- Click the `Run` button next to the `synotechai/syno-ai-run` image
- Open the "Optional settings" menu
- Set the port to `0` in the second "Host port" field (for automatic port assignment)
- Under "Volumes", configure:
  - Host path: Your chosen directory (e.g., `C:\syno-ai-data`)
  - Container path: `/a0`

![docker port mapping](res/setup/3-docker-port-mapping-updatedv2syno.png)

- Click the `Run` button in the "Images" tab.
- The container will start and show in the "Containers" tab

![docker containers](res/setup/4-docker-container-started-updatedsyno.png)

> [!TIP]
> Alternatively, run the following command in your terminal:
> ```bash
> docker run -p $PORT:80 -v /path/to/your/data:/a0 synotechai/syno-ai-run
> ```
> - Replace `$PORT` with the port you want to use (e.g., `50080`)
> - Replace `/path/to/your/data` with your chosen directory path

2.4. Access the Web UI:
- The framework will take a few seconds to initialize and the Docker logs will look like the image below.
- Find the mapped port in Docker Desktop (shown as `<PORT>:80`) or click the port right under the container ID as shown in the image below

![docker logs](res/setup/5-docker-click-to-open-updatedsyno.png)

- Open `http://localhost:<PORT>` in your browser
- The Web UI will open. Syno AI is ready for configuration!

![docker ui](res/setup/6-docker-a0-running-updatedsyno.png)

> [!TIP]
> You can also access the Web UI by clicking the ports right under the container ID in Docker Desktop.

> [!NOTE]
> After starting the container, you'll find all Syno AI files in your chosen 
> directory. You can access and edit these files directly on your machine, and 
> the changes will be immediately reflected in the running container.

3. Configure Syno AI
- Refer to the following sections for a full guide on how to configure Syno AI.

## Settings Configuration
Syno AI provides a comprehensive settings interface to customize various aspects of its functionality. Access the settings by clicking the "Settings"button with a gear icon in the sidebar.

### Agent Configuration
- **Prompts Subdirectory:** Choose the subdirectory within `/prompts` for agent behavior customization. The 'default' directory contains the standard prompts.
- **Memory Subdirectory:** Select the subdirectory for agent memory storage, allowing separation between different instances.
- **Knowledge Subdirectory:** Specify the location of custom knowledge files to enhance the agent's understanding.

![settings](res/setup/settings/1-agentConfig.png)

### Chat Model Settings
- **Provider:** Select the chat model provider (e.g., Ollama)
- **Model Name:** Choose the specific model (e.g., llama3.2)
- **Temperature:** Adjust response randomness (0 for deterministic, higher values for more creative responses)
- **Context Length:** Set the maximum token limit for context window
- **Context Window Space:** Configure how much of the context window is dedicated to chat history

### Utility Model Configuration
- **Provider & Model:** Select a smaller, faster model for utility tasks like memory organization and summarization
- **Temperature:** Adjust the determinism of utility responses

### Embedding Model Settings
- **Provider:** Choose the embedding model provider (e.g., OpenAI)
- **Model Name:** Select the specific embedding model (e.g., text-embedding-3-small)

### Speech to Text Options
- **Model Size:** Choose the speech recognition model size
- **Language Code:** Set the primary language for voice recognition
- **Silence Settings:** Configure silence threshold, duration, and timeout parameters for voice input

### API Keys
- Configure API keys for various service providers directly within the Web UI
- Click `Save` to confirm your settings

### Authentication
- **UI Login:** Set username for web interface access
- **UI Password:** Configure password for web interface security
- **Root Password:** Manage Docker container root password for SSH access

![settings](res/setup/settings/3-auth-updatedsyno.png)

### Development Settings
- **RFC Parameters (local instances only):** configure URLs and ports for remote function calls between instances
- **RFC Password:** Configure password for remote function calls
Learn more about Remote Function Calls and their purpose [here](#7-configure-syno-ai-rfc).

> [!IMPORTANT]
> Always keep your API keys and passwords secure.

# Choosing Your LLMs
The Settings page is the control center for selecting the Large Language Models (LLMs) that power Syno AI.  You can choose different LLMs for different roles:

| LLM Role | Description |
| --- | --- |
| `chat_llm` | This is the primary LLM used for conversations and generating responses. |
| `utility_llm` | This LLM handles internal tasks like summarizing messages, managing memory, and processing internal prompts.  Using a smaller, less expensive model here can improve efficiency. |
| `embedding_llm` | This LLM is responsible for generating embeddings used for memory retrieval and knowledge base lookups. Changing the `embedding_llm` will re-index all of A0's memory. |

**How to Change:**
1. Open Settings page in the Web UI.
2. Choose the provider for the LLM for each role (Chat model, Utility model, Embedding model) and write the model name.
3. Click "Save" to apply the changes.

## Important Considerations

> [!CAUTION]
> Changing the `embedding_llm` will re-index all the memory and knowledge, and 
> requires clearing the `memory` folder to avoid errors, as the embeddings can't be 
> mixed in the vector database. Note that this will DELETE ALL of Syno AI's memory.

## Installing and Using Ollama (Local Models)
If you're interested in Ollama, which is a powerful tool that allows you to run various large language models locally, here's how to install and use it:

#### First step: installation
**On Windows:**

Download Ollama from the official website and install it on your machine.

<button>[Download Ollama Setup](https://ollama.com/download/OllamaSetup.exe)</button>

**On macOS:**
```
brew install ollama
```
Otherwise choose macOS installer from the [official website](https://ollama.com/).

**On Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Finding Model Names:**
Visit the [Ollama model library](https://ollama.com/library) for a list of available models and their corresponding names.  The format is usually `provider/model-name` (or just `model-name` in some cases).

#### Second step: pulling the model
**On Windows, macOS, and Linux:**
```
ollama pull <model-name>
```

1. Replace `<model-name>` with the name of the model you want to use.  For example, to pull the Mistral Large model, you would use the command `ollama pull mistral-large`.

2. A CLI message should confirm the model download on your system

#### Selecting your model within Syno AI
1. Once you've downloaded your model(s), you must select it in the Settings page of the GUI. 

2. Within the Chat model, Utility model, or Embedding model section, choose Ollama as provider.

3. Write your model code as expected by Ollama, in the format `llama3.2` or `qwen2.5:7b`

4. Click `Save` to confirm your settings.

![ollama](res/setup/settings/4-local-models-updatedsyno.png)

#### Managing your downloaded models
Once you've downloaded some models, you might want to check which ones you have available or remove any you no longer need.

- **Listing downloaded models:** 
  To see a list of all the models you've downloaded, use the command:
  ```
  ollama list
  ```
- **Removing a model:**
  If you need to remove a downloaded model, you can use the `ollama rm` command followed by the model name:
  ```
  ollama rm <model-name>
  ```


- Experiment with different model combinations to find the balance of performance and cost that best suits your needs. E.g., faster and lower latency LLMs will help, and you can also use `faiss_gpu` instead of `faiss_cpu` for the memory.

## Using Syno AI on your mobile device
Syno AI's Web UI is accessible from any device on your network through the Docker container:

1. The Docker container automatically exposes the Web UI on all network interfaces
2. Find the mapped port in Docker Desktop:
   - Look under the container name (usually in the format `<PORT>:80`)
   - For example, if you see `32771:80`, your port is `32771`
3. Access the Web UI from any device using:
   - Local access: `http://localhost:<PORT>`
   - Network access: `http://<YOUR_COMPUTER_IP>:<PORT>`

> [!TIP]
> - Your computer's IP address is usually in the format `192.168.x.x` or `10.0.x.x`
> - You can find your external IP address by running `ipconfig` (Windows) or `ifconfig` (Linux/Mac)
> - The port is automatically assigned by Docker unless you specify one

> [!NOTE]
> If you're running Syno AI directly on your system (legacy approach) instead of 
> using Docker, you'll need to configure the host manually in `run_ui.py` to run on all interfaces using `host="0.0.0.0"`.

For developers or users who need to run Syno AI directly on their system,see the [In-Depth Guide for Full Binaries Installation](#in-depth-guide-for-full-binaries-installation).

# How to update Syno AI

1. **If you come from the previous version of Syno AI (pre-0.7.1):**
- Your data is safely stored across various directories and files inside the Syno AI folder.
- To update to the new Docker runtime version, you need to save the following files and directories:
  - `/memory` - Agent's memory
  - `/knowledge` - Custom knowledge base
  - `/instruments` - Custom instruments and functions
  - `/prompts` - Custom prompts files (if any has been created)
  - `/work_dir` - Working directory
  - `.env` - Your API keys
  - `/tmp/settings.json` - Your Syno AI settings
- Once you have saved these files and directories, you can proceed with the Docker runtime [installation instructions above](#windows-macos-and-linux-setup-guide) setup guide.
- Reach for the folder where you saved your data and copy it to the new Syno AI folder set during the installation process.
- Syno AI will automatically detect your saved data and use it across memory, knowledge, instruments, prompts and settings.

> [!IMPORTANT]
> Make sure to use the same embedding model you were using before, otherwise 
> you will have to re-index all of Syno AI's memory, therefore deleting all 
> your custom knowledge and memory.
>
> If you have issues loading your settings, you can try to delete the `/tmp/settings.json` 
> file and let Syno AI generate a new one.

2. **Update Process (Docker Desktop)**
- Go to Docker Desktop and stop the container from the "Containers" tab
- Right-click and select "Remove" to remove the container
- Go to "Images" tab and remove the `synotechai/syno-ai-run` image or click the three dots to pull the difference and update the Docker image.

![docker delete image](res/setup/docker-delete-image-1-updatedsyno.png)

- Search and pull the new image if you chose to remove it
- Run the new container with the same volume settings as the old one

> [!IMPORTANT]
> Make sure to use the same volume mount path when running the new
> container to preserve your data. The exact path depends on where you stored
> your Syno AI data directory (the chosen directory on your machine).

> [!TIP]
> Alternatively, run the following commands in your terminal:
>
> ```bash
> # Stop the current container
> docker stop syno-ai
>
> # Remove the container (data is safe in the folder)
> docker rm syno-ai
>
> # Remove the old image
> docker rmi synotechai/syno-ai-run
>
> # Pull the latest image
> docker pull synotechai/syno-ai-run
>
> # Run new container with the same volume mount
> docker run -p $PORT:80 -v /path/to/your/data:/a0 synotechai/syno-ai-run
> ```



