var login = require('./login')

module.exports = {
  "Logout" : function (browser) {
    login(browser)
      .waitForElementVisible('header.main li.username', 10000)
      .moveToElement('header.main li.username', 10, 10)
      .click('header.main li.username li.logout')
      .waitForElementPresent('#main > div.login', 10000)
      // .pause(1000)
      .execute(
        function() { 
          return sessionStorage.length; 
        }, 
        [], 
        function(result) {
          this.assert.equal(result.value, 1)
        }
      )
      // .pause(2000)
      .end();
  }
};