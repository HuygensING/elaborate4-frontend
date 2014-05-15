module.exports = function (browser) {
  return browser
    .url("http://localhost:9000/login")
    
    .waitForElementVisible('form.login', 1000)
         
    .setValue('form.login input[name="username"]', 'root')
    .setValue('form.login input[name="password"]', 'toor')
    .click('form.login button[name="submit"]')
    
    .waitForElementVisible('#container > header', 10000)
};