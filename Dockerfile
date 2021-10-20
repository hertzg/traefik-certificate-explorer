FROM node:17-alpine AS deps_prod
WORKDIR /app
COPY ./package.json /yarn.lock ./
RUN yarn install --production

FROM deps_prod AS dist
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=deps_prod /app/node_modules/ /app/node_modules/
COPY ./docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV NODE_ENV "production"
ARG DIST_SRC="./dist"
WORKDIR /app
COPY ./public/ ./public/
COPY ./views/ ./views/
COPY $DIST_SRC/ ./dist/
EXPOSE 8884
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
