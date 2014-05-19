	describe "Managers:View", ->
		Backbone = require 'backbone'
		viewManager = require 'hilib/managers/view'
		BaseView = require 'hilib/views/base'
		StringFn = require 'hilib/functions/string'

		mainEl = document.createElement('div')
		viewManager.el = mainEl

		options = 
			tagName: 'span'
			className: 'test'

		afterEach ->
			viewManager.clear()
			# mainEl.innerHTML = ''

		# describe "show", ->			
		# 	it "should add Backbone.View to mainEl", ->
		# 		View = BaseView

		# 		viewManager.show View, options

		# 		mainEl.firstChild.className.should.equal 'test'

		# 	it "should not do anything without a Backbone.View", ->
		# 		viewManager.show()
		# 		mainEl.children.length.should.equal 0

		# 	it "should not rerender cached views", ->

		# 		class MyView extends BaseView
		# 			initialize: ->
		# 				@options.cached = true
		# 				super

		# 		# console.log MyView.className, MyView.id

		# 		# console.log StringFn.hashCode MyView.toString()
		# 		# console.log StringFn.hashCode BaseView.toString()

		# 		viewManager.show MyView,
		# 			tagName: 'sup'
		# 			className: 'cachetest'

		# 		viewManager.show BaseView, options

		# 		viewManager.show MyView,
		# 			tagName: 'sup'
		# 			className: 'cachetest'


		# 		mainEl.firstChild.className.should.equal 'cachetest'

