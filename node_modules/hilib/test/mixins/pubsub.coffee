	describe "Pubsub", ->
		pubsub = require 'hilib/mixins/pubsub'
		pubsubObj = _.extend(Backbone.Events, pubsub);
		
		describe "publish", ->
			it "should trigger an event on Backbone", (done) ->
				Backbone.on 'my_event', -> done()

				pubsubObj.publish 'my_event'

		describe "subscribe", ->
			it "should receive an event from Backbone", (done) ->
				pubsubObj.subscribe 'my_event2', -> done()

				Backbone.trigger 'my_event2'