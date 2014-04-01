# Elaborate front end

## Quick links

* Multiple layers: http://localhost:4000/projects/lipsius_correspondence/entries/18033/transcriptions/diplomatic
* Long annotations: http://localhost:4000/projects/de_ystroom/entries/19086/transcriptions/diplomatic
* Annotation metadata: http://localhost:4000/projects/de_ystroom/entries/19080/transcriptions/diplomatic/annotations/52476

## rsync front-end:
* rsync --compress --archive --verbose --checksum --chmod=a+r compiled/ elaborate4@hi14hingtest.huygens.knaw.nl:elab4testFE/

## Deploy to test

## Deploy to production
* Change restUrl in elaborate-modules/modules/models/config.coffee
* gulp compile
* cd compiled/ && zip -r werkomgeving.zip *
* scp werkomgeving.zip gijsjb@hi7.huygens.knaw.nl:/tmp/
* Bram B mailen :)