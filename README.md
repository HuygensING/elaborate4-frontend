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
## Publication development

1. Run the backend locally: `docker run -p 4002:8080 -d brambdocker/hattem-edition`
2. `npm start`


## BoschDoc development
1. Run the backend locally: `docker run -d -p 4101:8080 --name boschdoc-draft brambdocker/boschdoc-draft`
2. `npm start`

## BoschDoc production
- `npm run dist`
- `docker-compose -p elaborate4 -f apps/boschdoc/docker-compose.yml up --build -d`
- go to localhost






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
