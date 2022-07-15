FROM node:14-slim

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure copying both package.json AND package-lock.json (when available).
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy local code to the container image.
COPY . ./

# Run the web service on container startup.
CMD [ "node", "src/index.js" ]
