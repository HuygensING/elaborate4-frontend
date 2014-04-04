assert = require('assert')
fs = require('fs')

webdriver = require('browserstack-webdriver')
test = require('browserstack-webdriver/testing')

test.describe 'Google Search', ->
	test.before ->
		capabilities =
			'browserName' : 'firefox'
			'browserstack.user' : 'gijsjanbrouwer'
			'browserstack.key' : 'wATzzZqEZP4Bqt9KwEKo'

		driver = new webdriver.Builder().usingServer('http://hub.browserstack.com/wd/hub').withCapabilities(capabilities).build()
	
	test.it 'should append query to title', ->
		driver.get('http://www.google.com')
		driver.findElement(webdriver.By.name('q')).sendKeys('BrowserStack')
		driver.findElement(webdriver.By.name('btnG')).click()
		driver.wait (->
			driver.getTitle().then (title) -> 'BrowserStack - Google Search' is title
		), 1000

	test.after -> driver.quit()