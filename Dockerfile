# --- Stage 1 : build du frontend ---
	FROM node:22-alpine AS frontend-build
	WORKDIR /app/frontend
	COPY frontend/package*.json ./
	RUN npm ci
	COPY frontend/ ./
	RUN npm run build          # produce frontend/dist
	
	# --- Stage 2 : build du backend + assemblage ---
	FROM node:22-alpine AS backend-build
	WORKDIR /app/backend
	COPY backend/package*.json ./
	RUN npm ci
	COPY backend/ ./
	COPY --from=frontend-build /app/frontend/dist ./src/frontend
	RUN npm run doc             
	
	# --- Stage 3 : image finale, runtime seul ---
	FROM node:22-alpine
	WORKDIR /app
	ENV NODE_ENV=production
	COPY --from=backend-build /app/backend ./
	CMD ["npm", "run", "start:prod"]