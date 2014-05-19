	describe "Fn", ->
		Fn = require 'hilib/functions/general'

		describe "generateID()", ->
			it "Without parameters the ID should have 8 chars", ->
				Fn.generateID().should.have.length 8

			it "With a parameter (1-20) the ID should have the length (1-20) of the parameter", ->
				for i in [1...20]
					Fn.generateID(i).should.have.length i

			it "An ID starts with a letter", ->
				Fn.generateID().should.match /^[a-zA-Z]/

		describe "deepCopy()", ->
			originalArray = ["sint", "niklaas", 14, ["la", "li"]]
			originalObject =
					Sint: "Niklaas"
					Jan: "Maat"
					During: 12
					la:
						li: "leuk"

			it "should create an equal copy of an object", ->
				copy = Fn.deepCopy(originalObject)
				copy.should.eql originalObject

			it "should create an equal copy of an array", ->
				copy = Fn.deepCopy(originalArray)
				copy.should.eql originalArray

			it "should not reference", ->
				copy = Fn.deepCopy(originalObject)
				copy.la.li = "lachen"

				copy.should.not.eql originalObject


		describe "timeoutWithReset()", ->
			it "should fire only once", (done) ->
				cb_called = 0
				
				Fn.timeoutWithReset 18, ->
					cb_called++

				Fn.timeoutWithReset 22, ->
					cb_called++

				setTimeout (->
					cb_called.should.equal 1
					done()
				), 50

		describe "compareJSON()", ->
			current =
				test: 'toets'
				taat: 12
				trier: 'teflon'
				tramp: ['tre', ['tro'], ['try']]
				trap:
					la: 'li'
					lo:
						le: 'ly'
				lamp: 
					lem: ['tre', ['tro'], ['try']]
				lip: [
					la: 'lomp'
				, 
					le: 'limp'
				, 
					ly: 'lemp'
				]

			changed = 
				tast: 'toets'
				taat: 14
				trier: 'teflan'
				tramp: ['tre', ['tro'], ['tre']]
				trap:
					la: 'li'
					lo:
						le: 'lo'
				lamp: 
					lem: ['tre', ['tro'], ['tre']]
				lip: [
					la: 'lomp'
				, 
					le: 'lamp'
				, 
					ly: 'lemp'
				]

			changes = Fn.compareJSON current, changed
			
			it "should set test to removed", ->
				changes.test.should.eql 'removed'

			it "should set tast to added", ->
				changes.tast.should.eql 'added'

			it "should set trier value (String) to the new value ('teflan')", ->
				changes.trier.should.eql changed.trier

			it "should set taat value (Number) to the new value (14)", ->
				changes.taat.should.eql changed.taat

			it "should set tramp value (Array) to the new value (Array)", ->
				changes.tramp.should.eql changed.tramp

			it "should set trap value (Object) to the new value (Object)", ->
				changes.trap.should.eql changed.trap

			it "should set lip value (Array of Objects) to the new value (Array of Object)", ->
				changes.lip.should.eql changed.lip

			it "should set lamp value (Object with nested Array) to the new value (Object with nested Array)", ->
				changes.lamp.should.eql changed.lamp

		describe "isObjectLiteral()", ->
			it "should return true on an object literal", ->
				Fn.isObjectLiteral({}).should.be.ok
			it "should return true on an instantiated object", ->
				Fn.isObjectLiteral(new Object()).should.be.ok
			it "should return false on an array", ->
				Fn.isObjectLiteral([]).should.not.be.ok
			it "should return false on a string", ->
				Fn.isObjectLiteral('lali').should.not.be.ok
			it "should return false on an instantiated object", ->
				Fn.isObjectLiteral(new Number()).should.not.be.ok

