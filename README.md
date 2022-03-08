eLaborate (frontend)
===================

[![Project Status: Inactive – The project has reached a stable, usable state but is no longer being actively developed; support/maintenance will be provided as time allows.](https://www.repostatus.org/badges/latest/inactive.svg)](https://www.repostatus.org/#inactive)

## What is eLaborate?

eLaborate is an online work environment in which scholars can upload scans, transcribe and annotate text, and publish the results as on online text edition which is freely available to all users.
eLaborate is developed by [Huygens ING](http://www.huygens.knaw.nl/).

This repository contains frontends for
- work environment, see `./apps/boschdoc`
- publication environment, see `./apps/publication`
- BoschDoc, see `./apps/work-environment`

The frontends communicate with a [backend](https://github.com/HuygensING/elaborate4-backend)

## Install

```
$ git clone https://github.com/HuygensING/elaborate4-frontend.git
$ npm install
```

## Common
The frontends make use of 3 common packages found in `./common`
