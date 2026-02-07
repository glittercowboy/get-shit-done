FROM node:20-slim

# Install system dependencies
# git: for version control
# python3: often used by build scripts or GSD agents
# curl/wget: for web fetch tools
# procps: for ps command
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    curl \
    wget \
    procps \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Global GSD installation
# We install the package from npm (as per standard usage)
RUN npm install -g get-shit-done-cc

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set working directory to /app
# This is where the user's project will be mounted
WORKDIR /app

# Set entrypoint to our script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command remains bash
CMD ["/bin/bash"]
