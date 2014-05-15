var login = require('./login')
var entryMetadataField = 'MyTestEntryMetadataField'

module.exports = {
  "Add entry metadata field" : function (browser) {
    login(browser)
      .moveToElement('header.main span.projecttitle', 10, 10)
      .click('header.main li.settings')
      .click('.projectsettings li[data-tab="entries"]')
      .setValue('.entry-list .editablelist input', entryMetadataField)
      .keys(['\uE006'])
      .assert.elementPresent('.entry-list ul.selected li[data-id="'+entryMetadataField+'"]')
      .moveToElement('header.main span.projecttitle', 10, 10)
      .click('header.main li.search')
      .click('#main .submenu li[data-key="editmetadata"]')
      .assert.containsText('.editselection-placeholder .cell:last-child li:last-child label', entryMetadataField)
      .moveToElement('header.main span.projecttitle', 10, 10)
      .click('header.main li.settings')
      .click('.projectsettings li[data-tab="entries"]')
      .click('.entry-list ul.selected li[data-id="'+entryMetadataField+'"] span')
      .waitForElementVisible('body > .modal', 1000)
      .click('body > .modal footer button.submit')
      .assert.elementNotPresent('.entry-list ul.selected li[data-id="'+entryMetadataField+'"]')
      .end();
  }
};