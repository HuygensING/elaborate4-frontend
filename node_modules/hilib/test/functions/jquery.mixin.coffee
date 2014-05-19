	describe "jQuery mixins", ->
		require 'hilib/functions/jquery.mixin'
		
		describe "(el:contains(query))", ->
			$div = null

			before ->
				text = '<span>Dit is test tekst!</span><span>Tekst is test dit!</span><span>Dit is test text!</span><span>Text is test dit!</span>'
				$div = $('<div id="testdiv" />').html text

			it 'should find two els when searching for "tekst"', ->
				$div.find('span:contains(tekst)').length.should.equal 2

			it 'should find one el when searching for "test text"', ->
				$div.find('span:contains(test text)').length.should.equal 1

			it 'should find four els when searching for "dit"', ->
				$div.find('span:contains(dit)').length.should.equal 4

		describe "(el).scrollTo(pos)", ->
			pos = undefined
			$div = undefined
			
			before ->
				$div = $("<div id=\"scrollablediv\" style=\"width: 100px; height: 100px; overflow: auto\" />")
				$div.html "<p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p>some<br>text</p><p id=\"anchor\" style=\"color: red;\">some<br>text</p><p>some<br>text</p>"
				$("#sandbox").html $div
				pos = $("#anchor").position()

			beforeEach ->
				$div.scrollTop 0

			it "should scroll", (done) ->
				scrolled = false
				$div.scroll ->
				scrolled = true

				$div.scrollTo pos.top,
					duration: 100
					complete: ->
						scrolled.should.be.ok
						done()

			# it "should scroll into position", (done) ->
			# 	$div.scrollTo pos.top,
			# 		duration: 100
			# 		complete: ->
			# 			$("#anchor").position().top.should.equal 0
			# 			done()



		describe "(el).highlight()", ->
			$span = undefined
			before ->
				$span = $("<span />").html("test span")

			it "sets the highlight class", ->
				$span.highlight 200
				$span.hasClass("highlight").should.be.ok

			it "removes the highlight class after 0.2s delay", (done) ->
				setTimeout (->
					$span.hasClass("highlight").should.not.be.ok
					done()
				), 300