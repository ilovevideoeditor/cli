FROM node:22-slim

LABEL org.opencontainers.image.source="https://github.com/ilovevideoeditor/cli" \
      org.opencontainers.image.description="Render videos from VideoJSON specs in your terminal or CI"

ARG CLI_VERSION
RUN npm install -g "ilovevideoeditor@${CLI_VERSION:?CLI_VERSION build-arg is required}" \
    && npm cache clean --force

WORKDIR /work

ENTRYPOINT ["ilovevideoeditor"]
CMD ["help"]
