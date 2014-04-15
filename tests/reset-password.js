module.exports = {
  "Reset password" : function (browser) {
    browser
      .url("http://localhost:9000/login")
      
      .waitForElementVisible('li.resetpassword', 1000)
      .click('li.resetpassword')
      .waitForElementVisible('.modal.reset-password', 1000)
      
      .setValue('.modal.reset-password input[name="email"]', 'thisemailis@notvalid')
      .click('.modal.reset-password button[name="submit"]')
      .waitForElementVisible('.modal.reset-password li.input .error', 1000)
      .assert.containsText('.modal.reset-password li.input .error', 'Please enter a valid email address.')
      .clearValue('.modal.reset-password input[name="email"]')

      .setValue('.modal.reset-password input[name="email"]', 'thisemaildoes@notexist.not')
      .click('.modal.reset-password button[name="submit"]')
      .waitForElementVisible('.modal.reset-password li.message', 1000)
      .assert.containsText('.modal.reset-password li.message', 'unknown e-mail address: thisemaildoes@notexist.not')
      .clearValue('.modal.reset-password input[name="email"]')

      .setValue('.modal.reset-password input[name="email"]', 'agijsbro@gmail.com')
      .click('.modal.reset-password button[name="submit"]')
      .waitForElementVisible('.modal.reset-password li.input p', 1000)
      .assert.containsText('.modal.reset-password li.input p', 'An email has been send to your emailaddress. Please follow the link to reset your password.')
      
      .click('.modal.reset-password .overlay')
      .pause(500)
      .assert.elementNotPresent('.modal.reset-password')
      
      .end();
  }
};