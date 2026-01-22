# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port (Cloud Run will set PORT env variable)
EXPOSE 8080

# Start the app
CMD [ "node", "server.js" ]
