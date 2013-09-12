	describe "Token", ->
		token = require 'managers/token'

		describe "set", ->
			token.set 'somecooltoken'
			
			it "should set sessionStorage.elaborate_token", ->
				sessionStorage.getItem('elaborate_token').should.equal('somecooltoken')

			it "should set @token", ->
				token.token.should.equal('somecooltoken')

		describe "get", ->
			it "should get @token", ->
				sessionStorage.removeItem 'elaborate_token'
				token.get().should.equal('somecooltoken')

			it "should get sessionStorage.elaborate_token if no @token is present", ->
				sessionStorage.setItem 'elaborate_token', 'somecooltoken2'
				token.token = null;
				token.get().should.equal('somecooltoken2')

			it "should publish unauthorized if no @token or sessionStorage.elaborate_token is found", (done) ->
				sessionStorage.removeItem 'elaborate_token'
				token.token = null
				finished = false
				token.subscribe 'unauthorized', -> 
					done() if not finished
					finished = true

				token.get()