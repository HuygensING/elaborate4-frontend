eLaborate (frontend)
===================

## What is eLaborate?

eLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results as on online text edition which is freely available to all users.
eLaborate is developed by [Huygens ING](http://www.huygens.knaw.nl/).

This repository contains the frontend for the work environment (/apps/work-environment), which communicates with the [backend](https://github.com/HuygensING/elaborate4-backend) and the frontend for the publication (/apps/publication).

## Install

```
$ git clone https://github.com/HuygensING/elaborate4-frontend.git
$ npm install
```

## Edit the config file

elaborate4-frontend makes use of [elaborate-modules](https://github.com/HuygensING/elaborate-modules). These modules aren't part of the elaborate4-frontend repository, because they are also used by other Huygens ING frontend repositories.

The elaborate-modules are installed when `npm install` is run from the command line.

The config file can be found at `./node_modules/elaborate-modules/modules/models/config.coffee`

In the config file, alter the `restUrl` property to match the location of the elaborate-backend server you've set up.

## Development

1. Run the backend locally: `docker run -p 4002:8080 -d brambdocker/hattem-edition`
2. `npm start`


## Deploy

1. Set the remote-destination in `./config.json` (this is not the same as the elaborate-modules config.json!)
2. Update the version in package.json ($ npm version major|minor|patch)
3. Run `npm run compile`
4. Add, commit, push to Github
5. Run `npm run deploy-test` to simply rsync `./compiled` to the remote destination.

## Changelog

### 2.0.0
- Remove Gulp and replace with Webpack
- Remove CoffeeScript and replace with TypeScript
- Add Docker container for deployement
- Remove unused fonts from work environment
- Remove empty annotation list from publication

#### 1.3.4
- Add diacritics

#### 1.3.3
- Replace Junicode with Titus font

#### 1.3.1
- Link to publications-errors page from project settings

#### 1.3.0
- Show bioport ID in person annotations
- Note reference 'romein'
- Add diacritics
- Add publish draft errors
- Add project type MVN
- Remove elaborate modules dependency

#### 1.2.1
- Instead of triggering a global Backbone event, change the faceted search config directly.
- Bump Faceted Search to 2.3.1

#### 1.2.0

- [feat] Add wordwrap option to general settings.
- [feat] Add results-per-page option to general settings.
- [feat] Move print button to preview layer.
- [feat] Move edit multiple metadata to separate view.
- [feat] Rename buttons in search submenu (add entry, edit results metadata and remove project)
- [fix] Prev/next would render active without ID.
- [fix] Reader shouldn't be able to edit or remove annotations.
- Bump Faceted Search to 2.3.0

#### 1.1.2

- [fix] Sort levels would call a removed method.

#### 1.1.1

- [fix] Add @options argument to views initialize method for Backbone v1+

#### 1.1.0

- [feat] Make entry metadata better readable and editable.
- [feat] Add title attribute to entry title.
- [perf] Change edit facsimiles logic.
