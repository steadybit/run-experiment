FROM node

COPY dist/index.js /index.js
COPY run.sh /run.sh

ENTRYPOINT ["/run.sh"]