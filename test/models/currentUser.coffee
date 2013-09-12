	describe "currentUser", ->
		currentUser = require 'models/currentUser'
		Backbone = require 'backbone'

		before ->
			currentUser.clear()
			sessionStorage.clear()

			un = $('<input type="text" id="username" />').val 'root'
			pw = $('<input type="password" id="password" />').val 'toor'

			$('#sandbox').append(un)
			$('#sandbox').append(pw)

		describe "authorize", ->
			it "should have a token, user and projects", ->

		describe "login", ->
			it "should call authorized event on correct credentials", (done) ->
				finished = false # ignore firing multiple times
				Backbone.on 'authorized', -> 
					done() if not finished
					finished = true
				currentUser.login()

			it "should set a sessionStorage.huygens_user", ->
				sessionStorage.getItem('huygens_user').should.exist

			it "should restore the user from sessionStorage", (done) ->
				currentUser.clear() # Remove all attributes

				Backbone.on 'authorized', ->
					currentUser.id.should.be.a('number')
				
					currentUser.off 'authorized'
					done()

				currentUser.login()

			it "should call unauthorized cb on incorrect credentials", (done) ->
				currentUser.clear()
				sessionStorage.clear()

				$('#password').val 'wrongpass' # Set wrong password

				Backbone.on 'unauthorized', -> done()
				currentUser.login()


		after ->
			currentUser.off()
			$('#password').val 'qe9hEtra' # Restore correct password