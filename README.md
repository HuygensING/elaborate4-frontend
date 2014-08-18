eLaborate (frontend)
===================

## What is eLaborate?

eLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results as on online text edition which is freely available to all users.
eLaborate is developed by [Huygens ING](http://www.huygens.knaw.nl/).

This repository contains the frontend, which communicates with the [backend](https://github.com/HuygensING/elaborate4-backend).

## Install

```
$ git clone https://github.com/HuygensING/elaborate4-frontend.git
$ npm install
$ cp config-example.json config.json
$ gulp compile
```

## Edit the config file

elaborate4-frontend makes use of [elaborate-modules](https://github.com/HuygensING/elaborate-modules). These modules aren't part of the elaborate4-frontend repository, because they are also used by other Huygens ING frontend repositories.

The elaborate-modules are installed when `npm install` is run from the command line.

The config file can be found at `./node_modules/elaborate-modules/modules/models/config.coffee`

In the config file, alter the `restUrl` property to match the location of the elaborate-backend server you've set up.

## Development

For development purposes `gulp` can be run from the command line. Gulp loads the following tasks:

1. Add watchers for .coffee, .jade and .stylus files.
2. Bundles .coffee and .jade files using Browserify.
3. Launches elaborate4-frontend in the browser with browser-sync.

## Deploy

1. Set the remote-destination in `./config.json` (this is not the same as the elaborate-modules config.json!)
2. Run 'gulp deploy' to simply rsync `./compiled` to the remote destination.

## Changelog

#### 1.1.2

- [bug] Sort levels would call removed method.

#### 1.1.1

- [bug] Add @options argument to views initialize method for Backbone v1+

#### 1.1.0

- [feat] Make entry metadata better readable and editable.
- [feat] Add title attribute to entry title.
- [perf] Change edit facsimiles logic.