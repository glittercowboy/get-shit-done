#!/bin/bash

# Function to build and run GSD in Docker
function gsd-secure() {
    # [REPO VERSION] Uses the script's own directory as Docker context
    # This magic line gets the directory where the script is located
    local DOCKER_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    local IMAGE_NAME="gsd-sandbox"
    
    # 0. Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "\033[0;31mERROR: Docker is not running!\033[0m"
        echo -e "\033[0;33mPlease start Docker Desktop or the Docker daemon.\033[0m"
        return 1
    fi

    # 1. Build Image (if missing)
    if [[ "$(docker images -q $IMAGE_NAME 2> /dev/null)" == "" ]]; then
        echo -e "\033[0;36mBuilding GSD Sandbox image... (First run only)\033[0m"
        # Use Repo Root as context to include 'agents/' folder
        docker build -t $IMAGE_NAME -f "$DOCKER_DIR/Dockerfile" "$DOCKER_DIR/.."
    fi

    # 2. Get Context
    local GIT_NAME=$(git config --get user.name)
    if [ -z "$GIT_NAME" ]; then GIT_NAME="gsd-user"; fi
    
    local GIT_EMAIL=$(git config --get user.email)
    if [ -z "$GIT_EMAIL" ]; then GIT_EMAIL="gsd@local"; fi

    # Robust path resolution
    local CURRENT_DIR=$(pwd)
    
    # Universal Auth Mapping
    local MOUNT_ARGS=""
    
    # 1. Gemini
    local GEMINI_PATH="$HOME/.gemini"
    if [ -d "$GEMINI_PATH" ]; then
        MOUNT_ARGS="$MOUNT_ARGS -v $GEMINI_PATH:/root/.gemini"
        echo -e "\033[0;90m [Auth] Gemini keys detected.\033[0m"
    fi

    # 2. Claude
    local CLAUDE_PATH="$HOME/.claude"
    if [ -d "$CLAUDE_PATH" ]; then
        MOUNT_ARGS="$MOUNT_ARGS -v $CLAUDE_PATH:/root/.claude"
        echo -e "\033[0;90m [Auth] Claude keys detected.\033[0m"
    fi

    # 3. OpenCode
    if [ -d "$HOME/.config/opencode" ]; then
        MOUNT_ARGS="$MOUNT_ARGS -v "$HOME/.config/opencode:/root/.config/opencode"
        echo -e "\033[0;90m [Auth] OpenCode keys detected.\033[0m"
    fi

    # 4. Amp (Legacy)
    if [ -d "$HOME/.config/amp" ]; then
        MOUNT_ARGS="$MOUNT_ARGS -v "$HOME/.config/amp:/root/.config/amp"
        echo -e "\033[0;90m [Auth] Amp keys detected.\033[0m"
    fi

    echo -e "\033[0;32mEntering GSD Secure Sandbox...\033[0m"
    echo -e "\033[0;37m  Project: $CURRENT_DIR\033[0m"
    echo -e "\033[0;37m  Identity: $GIT_NAME <$GIT_EMAIL>\033[0m"

    # Run Container
    docker run --rm -it \
        -v "$CURRENT_DIR:/app" \
        -v "gsd-npm-cache:/root/.npm" \
        $MOUNT_ARGS \
        -e "GIT_AUTHOR_NAME=$GIT_NAME" \
        -e "GIT_AUTHOR_EMAIL=$GIT_EMAIL" \
        -e "GIT_COMMITTER_NAME=$GIT_NAME" \
        -e "GIT_COMMITTER_EMAIL=$GIT_EMAIL" \
        $IMAGE_NAME
}

# Add alias for convenience
alias gsd-box=gsd-secure

echo -e "\033[0;32mGSD Sandbox loaded. Type 'gsd-secure' to launch.\033[0m"
