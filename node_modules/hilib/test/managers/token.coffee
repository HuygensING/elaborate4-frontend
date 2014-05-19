	describe "Token", ->
		token = require 'hilib/managers/token'

		describe "set", ->
			token.set 'somecooltoken'
			
			it "should set sessionStorage.huygens_token", ->
				sessionStorage.getItem('huygens_token').should.equal('somecooltoken')

			it "should set @token", ->
				token.token.should.equal('somecooltoken')

		describe "get", ->
			it "should get @token", ->
				sessionStorage.removeItem 'huygens_token'
				token.get().should.equal('somecooltoken')

			it "should get sessionStorage.huygens_token if no @token is present", ->
				sessionStorage.setItem 'huygens_token', 'somecooltoken2'
				token.token = null;
				token.get().should.equal('somecooltoken2')

			# it "should publish unauthorized if no @token or sessionStorage.huygens_token is found", (done) ->
			# 	sessionStorage.removeItem 'huygens_token'
			# 	token.token = null
			# 	finished = false
			# 	token.subscribe 'unauthorized', -> 
			# 		done() if not finished
			# 		finished = true

			# 	token.get()