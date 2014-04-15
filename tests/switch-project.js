var login = require('./login')

module.exports = {
  "ResultView" : function (browser) {
    browser.mySwitchProject = function (projectId, projectTitle) {
      return browser
        .moveToElement('header.main li.username', 10, 10)
        .moveToElement('header.main li.username li.projects', 10, 10)
        .click('header.main li.username li.projects li[data-id="'+projectId+'"]')

        .pause(500)
        .waitForElementVisible('.resultview .results-placeholder .entries li.entry', 1000)
        .elements('css selector', '.resultview .results-placeholder .entries li.entry', function(response) {
          this.assert.equal(response.value.length, 50)
        })

        .pause(2000)
        
        .assert.containsText('header.main span.projecttitle', projectTitle)
        .assert.title('eLaborate - '+projectTitle)
    }

    login(browser)
      .waitForElementVisible('.resultview .results-placeholder', 10000)
      .mySwitchProject(1, 'Torec')
      .mySwitchProject(15, 'Roman van Walewein')
      .mySwitchProject(1, 'Torec')
      .end();
  }
};