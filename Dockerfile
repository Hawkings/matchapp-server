FROM node:18

WORKDIR /usr/src/matchapp

EXPOSE 7777

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# https://docs.npmjs.com/cli/v9/commands/npm-ci
# like npm install but for prod
RUN npm ci --omit=dev

# Bundle app source
COPY . .

RUN npm run build
CMD [ "node", "dist/app.js" ]
