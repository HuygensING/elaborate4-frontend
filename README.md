## Bump version
* edit package.json
* git add .
* git commit -m 'Bump to vx.x.x'
* git tag vx.x.x
* git push
* git push --tags
* deploy to test

## Deploy to test
* Change restUrl to DEV in elaborate-modules/modules/models/config.coffee
* gulp compile
* gulp deploy-test