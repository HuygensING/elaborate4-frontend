## Changelog

### 2.0.0
- Remove Gulp and replace with Webpack
- Remove CoffeeScript and replace with TypeScript
- Add Docker container for deployment
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
