FROM node:20-alpine

WORKDIR /app

# Copy API files
COPY api/package*.json ./
RUN npm ci --only=production

COPY api/ ./
COPY data/ ../data/
COPY SKILL_SPEC.md ../

EXPOSE 3001

CMD ["node", "server.js"]
