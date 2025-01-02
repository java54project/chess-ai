1) Install dependencies:
yarn install
yarn add kokopu
yarn build
yarn start

2) Update launch.json
Add NODE_ENV to launch.json:
            "env": {
                "NODE_ENV": "development"
            },