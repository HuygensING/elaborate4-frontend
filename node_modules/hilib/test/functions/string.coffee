	describe "StringFn", ->
		StringFn = require 'hilib/functions/string'

		describe "slugify", ->
			it "should slugify strings", ->
				StringFn.slugify("Jack & Jill like numbers 1,2,3 and 4 and silly characters ?%.$!/").should.equal "jack-jill-like-numbers-123-and-4-and-silly-characters"
				StringFn.slugify("Un éléphant à l'orée du bois").should.equal "un-elephant-a-loree-du-bois"
				StringFn.slugify("I am a word too, even though I am but a single letter: i!").should.equal "i-am-a-word-too-even-though-i-am-but-a-single-letter--i"


		describe "stripTags(str)", ->
			it "should strip the tags from a string", ->
				str = "This is <b>very</b> <input /> strange"
				StringFn.stripTags(str).should.not.contain "<b>"
				StringFn.stripTags(str).should.not.contain "</b>"
				StringFn.stripTags(str).should.not.contain "<input />"


		describe "onlyNumbers", ->
			it "should strip all non numbers from a string", ->
				str = "<10>_$%11 There were 12 little piggies, what! 14? Yeah! 13"
				StringFn.onlyNumbers(str).should.equal "1011121413"


