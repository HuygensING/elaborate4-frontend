define (require) ->
	chai = require 'chai'
	# sinon = require 'sinon'
	sinonChai = require 'sinon-chai'
	# config = require 'config'
	chai.use sinonChai

	console.log sinon

	should = chai.should()