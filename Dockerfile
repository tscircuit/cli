FROM oven/bun:latest

# Install Node.js 22 and npm
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json bun.lock ./
RUN bun install

# Copy the rest of the code
COPY . .

# Build the package
RUN bun run build

# Pack the package
RUN bun pm pack

# Create a temporary directory for testing
RUN mkdir /tmp/testdir

RUN ./dist/main.js --version

# Install the packed package globally
RUN npm install -g $(ls *.tgz)

RUN bunx --bun tsci --version

RUN tsci --version

# Initialize a new project in the temp directory and add dependencies
RUN cd /tmp/testdir && tsci init -y
# Test build in the temp directory
RUN cd /tmp/testdir && DEBUG="tsci:eval:*" bunx --bun tsci build index.tsx
RUN cd /tmp/testdir && tsci build index.tsx

# Verify build output
RUN test -f /tmp/testdir/index.tsx

CMD ["bun", "run", "dev"]
