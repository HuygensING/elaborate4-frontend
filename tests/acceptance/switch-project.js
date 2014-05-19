var login = require('./login')

module.exports = {
  "Switch project" : function (browser) {
    browser.mySwitchProject = function (projectId, projectTitle, numFound) {
      return browser
        .moveToElement('header.main li.username', 10, 10)
        .moveToElement('header.main li.username li.projects', 10, 10)
        .moveToElement('header.main li.username li.projects ul li.project:first-child', 10, 10)
        .click('header.main li.username li.projects li[data-id="'+projectId+'"]')

        .waitForElementNotPresent('#container > header .projecttitle i.fa-spinner', 10000)
        // .waitForElementVisible('.resultview .results-placeholder .entries li.entry', 1000)
        // .elements('css selector', '.resultview .results-placeholder .entries li.entry', function(response) {
        //   this.assert.equal(response.value.length, 50)
        // })

        // .pause(2000)
        
        .assert.containsText('header.main span.projecttitle', projectTitle)
        .assert.title('eLaborate - '+projectTitle)

        .waitForElementVisible('.results-placeholder h3.numfound', 10000)

        .assert.containsText('h3.numfound', 'Found '+numFound+' entries')

    }

    login(browser)
      .waitForElementVisible('.resultview .results-placeholder', 10000)
      .mySwitchProject(1, 'Torec', 69)
      .mySwitchProject(15, 'Roman van Walewein', 246)
      .mySwitchProject(1, 'Torec', 69)
      .end();
  }
};