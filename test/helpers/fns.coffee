	describe "Fn", ->
		Fn = require 'helpers/fns'

		describe "slugify", ->
			it "should slugify strings", ->
				Fn.slugify("Jack & Jill like numbers 1,2,3 and 4 and silly characters ?%.$!/").should.equal "jack-jill-like-numbers-123-and-4-and-silly-characters"
				Fn.slugify("Un éléphant à l'orée du bois").should.equal "un-elephant-a-loree-du-bois"
				Fn.slugify("I am a word too, even though I am but a single letter: i!").should.equal "i-am-a-word-too-even-though-i-am-but-a-single-letter--i"

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


		describe "stripTags(str)", ->
			it "should strip the tags from a string", ->
				str = "This is <b>very</b> <input /> strange"
				Fn.stripTags(str).should.not.contain "<b>"
				Fn.stripTags(str).should.not.contain "</b>"
				Fn.stripTags(str).should.not.contain "<input />"


		describe "onlyNumbers", ->
			it "should strip all non numbers from a string", ->
				str = "<10>_$%11 There were 12 little piggies, what! 14? Yeah! 13"
				Fn.onlyNumbers(str).should.equal "1011121413"


