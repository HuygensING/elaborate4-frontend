# A Super Tiny Editor

# ### Options
# * cssFile CSS file to include for custom style
# * model Backbone.Model
# * htmlAttribute The attribute on the model which holds the HTML to edit
# * width Number Width of the iframe
# * height Number Height of the iframe, total height includes the menu(s)
# * wrap Boolean Sets white-space to normal on the iframe body if set to true

$ = require 'jquery'

Fn = require '../../utils/general'
StringFn = require '../../utils/string'
require '../../utils/jquery.mixin'

Longpress = require '../longpress/main'

Views = 
	Base: require '../base'

tpl = require './main.jade'
diacriticsTpl = require './diacritics.jade'
# console.log tpls
# Templates =
# 	Main: require 'hilib/views/supertinyeditor/supertinyeditor.jade'
# 	Diacritics: require 'hilib/views/supertinyeditor/diacritics.jade'

# ## SuperTinyEditor
class SuperTinyEditor extends Views.Base

	className: 'supertinyeditor'

	# ### Initialize
	initialize: ->
		super

		@options.cssFile ?= ''
		@options.html ?= ''
		@options.width ?= '320'
		@options.height ?= '200'
		@options.wrap ?= false

		@on 'button:save', => # TODO Deactive save button

		@render()

	# ### Render
	render: ->
		@el.innerHTML = tpl()

		@$currentHeader = @$('.ste-header')

		@renderControls()

		@renderIframe()

		# @setFocus()
		
		@

	renderControls: ->
		for controlName in @options.controls
			div = document.createElement 'div'

			# N stands for 'New header', and is created by a new div.ste-header
			if controlName is 'n'
				div.className = 'ste-header'
				# Insert after last .ste-header by inserting before .ste-body
				@$('.ste-body').before div
				# Set newly created header to be the @$currentHeader
				@$currentHeader = $(div)
			# Create a divider
			else if controlName is '|'
				div.className = 'ste-divider'
				@$currentHeader.append div
			# Create a diacritics menu
			else if controlName is 'diacritics'
				div.className = 'ste-control-diacritics '+controlName
				div.setAttribute 'title', StringFn.ucfirst controlName
				div.setAttribute 'data-action', controlName

				diacriticsUL = document.createElement 'div'
				diacriticsUL.className = 'diacritics-placeholder'
				diacritics = 'ĀĂÀÁÂÃÄÅĄⱭ∀ÆāăàáâãäåąɑæαªƁßβɓÇĆĈĊČƆçςćĉċč¢ɔÐĎĐḎƊðďđɖḏɖɗÈÉÊËĒĖĘẸĚƏÆƎƐ€èéêëēėęẹěəæεɛ€ƑƩƒʃƭĜĞĠĢƢĝğġģɠƣĤĦĥħɦẖÌÍÎÏĪĮỊİIƗĲìíîïīįịiiɨĳιĴĲĵɟĳĶƘķƙĹĻĽŁΛĺļľłλÑŃŅŇŊƝ₦ñńņňŋɲÒÓÔÕÖŌØŐŒƠƟòóôõöōøőœơɵ°Ƥ¶ƥ¶ŔŘɌⱤŕřɍɽßſŚŜŞṢŠÞ§ßſśŝşṣšþ§ŢŤṮƬƮţťṯƭʈÙÚÛÜŪŬŮŰŲɄƯƱùúûüūŭůűųưμυʉʊƲʋŴẄΩŵẅωÝŶŸƔƳýŷÿɣyƴŹŻŽƵƷẔźżžƶẕʒƹ£¥€₩₨₳Ƀ¤¡‼‽¿‽‰…••±‐–—±†‡′″‴‘’‚‛“”„‟≤‹≥›≈≠≡'
				diacriticsUL.innerHTML = diacriticsTpl diacritics: diacritics
				
				div.appendChild diacriticsUL

				@$currentHeader.append div
			else if controlName is 'wordwrap'
				div.className = 'ste-control-wordwrap'
				div.setAttribute 'title', 'Word wrap'
				div.setAttribute 'data-action', controlName

				@$currentHeader.append div
			# Create a button
			else if controlName.substr(0, 2) is 'b_'
				controlName = controlName.substr(2)
				div.className = 'ste-button'
				div.setAttribute 'data-action', controlName
				div.setAttribute 'title', StringFn.ucfirst controlName
				div.innerHTML = StringFn.ucfirst controlName
				@$currentHeader.append div
			# Create a 'normal' control
			else
				div.className = 'ste-control '+controlName
				div.setAttribute 'title', StringFn.ucfirst controlName
				div.setAttribute 'data-action', controlName
				@$currentHeader.append div

	# The iframe is already present (in the template), but has to be filled with a document.
	renderIframe: ->
		iframe = document.createElement 'iframe'
		iframe.style.width = @options.width + 'px'
		iframe.style.height = @options.height + 'px'
		iframe.src = "about:blank"
		iframe.onload = =>
			@iframeDocument = iframe.contentDocument
			@iframeDocument.designMode = 'On'
			@iframeDocument.open()
			@iframeDocument.write 	"<!DOCTYPE html>
									<html>
									<head><meta charset='UTF-8'><link rel='stylesheet' href='#{@options.cssFile}'></head>
									<body class='ste-iframe-body' spellcheck='false' contenteditable='true'>#{@model.get(@options.htmlAttribute)}</body>
									</html>"
			@iframeDocument.close()

			@iframeBody = @iframeDocument.querySelector 'body'
			@iframeBody.style.whiteSpace = 'normal' if @options.wrap

			@setFocus()

			@longpress = new Longpress
				parent: @el.querySelector '.ste-body'

			# Hack, hack, hack.
			# The scroll event on the iframe is fired (through the contentDocument or contentWindow), but no scrollLeft,
			# scrollWidth or clientWidth are given. ScrollWidth and clientWidth are found by document.documentElement, but
			# for scrollLeft we need jQuery. Normally Fn.scrollPercentage receives ev.currentTarget or ev.target, but we have
			# to construct the object ourselves in this case.
			# 
			# Scroll is also triggered when using the contentWindow.scrollTo function in @setScrollPercentage, 
			# but should not update the other scroll(s).@autoScroll is used to prevent both scrollers of updating eachother
			# and thus forming a loop.
			@iframeDocument.addEventListener 'scroll', => @triggerScroll() unless @autoScroll

			@iframeDocument.addEventListener 'keyup', (ev) =>
				Fn.timeoutWithReset 500, => 
					@triggerScroll()
					@saveHTMLToModel()

		steBody = @el.querySelector '.ste-body'
		steBody.appendChild iframe
	
	# ### Events
	events: ->
		'click .ste-control': 'controlClicked'
		'click .ste-control-diacritics ul.diacritics li': 'diacriticClicked'
		'click .ste-control-wordwrap': 'wordwrapClicked'
		'click .ste-button': 'buttonClicked'

	buttonClicked: (ev) ->
		action = ev.currentTarget.getAttribute 'data-action'
		
		if action isnt 'save' or (action is 'save' and $(ev.currentTarget).hasClass('active'))
			@trigger 'button:' + action

	controlClicked: (ev) ->
		action = ev.currentTarget.getAttribute 'data-action'
		@iframeDocument.execCommand action, false, null
		@saveHTMLToModel()
		@trigger 'control:' + action

	wordwrapClicked: (ev) ->
		iframeBody = $ @iframeBody
		iframeBody.toggleClass 'wrap'
		@trigger 'control:wordwrap', iframeBody.hasClass 'wrap'

	diacriticClicked: (ev) ->
		# Get the selection from the contentWindow
		sel = @el.querySelector('iframe').contentWindow.getSelection()

		# Delete the range and insert the clicked char
		range = sel.getRangeAt 0
		range.deleteContents()
		textNode = ev.currentTarget.childNodes[0].cloneNode()
		range.insertNode textNode

		# Move cursor after textNode
		range.setStartAfter textNode
		range.setEndAfter textNode 
		sel.removeAllRanges()
		sel.addRange range

		@saveHTMLToModel()

		@trigger 'control:diacritic', textNode

	# ### Methods

	destroy: ->
		@longpress.destroy()
		@remove()

	saveHTMLToModel: -> 
		# TODO Active save button
		@$('[data-action="save"]').addClass 'active'
		@model.set @options.htmlAttribute, @iframeBody.innerHTML

	triggerScroll: ->
		iframe = @el.querySelector 'iframe'

		target =
			scrollLeft: $(iframe).contents().scrollLeft()
			scrollWidth: iframe.contentWindow.document.documentElement.scrollWidth
			clientWidth: iframe.contentWindow.document.documentElement.clientWidth
			scrollTop: $(iframe).contents().scrollTop()
			scrollHeight: iframe.contentWindow.document.documentElement.scrollHeight
			clientHeight: iframe.contentWindow.document.documentElement.clientHeight

		@trigger 'scrolled', Fn.getScrollPercentage target

	setModel: (model) ->
		@setInnerHTML model.get @options.htmlAttribute
		@model = model
		@setFocus()

	setInnerHTML: (html) ->
		@iframeBody.innerHTML = html

	# TODO rename to setHeight, setWidth
	setIframeHeight: (height) ->
		iframe = @el.querySelector 'iframe'
		iframe.style.height = height + 'px'

	setIframeWidth: (width) ->
		iframe = @el.querySelector 'iframe'
		iframe.style.width = width + 'px'

	# Set focus to the end of the body text
	setFocus: ->
		if @iframeBody? and win = @el.querySelector('iframe').contentWindow
			Fn.setCursorToEnd @iframeBody, win

	setScrollPercentage: (percentages) ->
		contentWindow = @el.querySelector('iframe').contentWindow
		documentElement = contentWindow.document.documentElement

		clientWidth = documentElement.clientWidth
		scrollWidth = documentElement.scrollWidth
		clientHeight = documentElement.clientHeight
		scrollHeight = documentElement.scrollHeight

		top = (scrollHeight - clientHeight) * percentages.top/100
		left = (scrollWidth - clientWidth) * percentages.left/100

		@autoScroll = true
		contentWindow.scrollTo left, top
		# Give the receiving end (Views.EntryPreview) some time to respond and then turn off the autoScroll
		setTimeout (=> @autoScroll = false), 200

	# show: -> @el.style.display = 'block'
	# hide: -> @el.style.display = 'none'
	# visible: -> @el.style.display is 'block'

module.exports = SuperTinyEditor