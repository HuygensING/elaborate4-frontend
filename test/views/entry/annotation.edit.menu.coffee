	describe "Annotation Edit Menu", =>
		AnnotationEditMenu = require 'views/entry/annotation.edit.menu'
		aem = new AnnotationEditMenu
			model: new Backbone.Model({body: 'my annotation'})
			collection: new Backbone.Collection()
		stub = sinon.stub(aem.model, 'save')
		# stub = null
		# beforeEach: =>

		# afterEach: =>
		# 	aem.model.save.restore()

		describe "save", =>
			it "should save a new annotation", =>
				aem.save()
				stub.should.have.been.calledOnce

				
			it "should add a new annotation to the annotations collection", ->
			it "should save an existing annotation", ->
		describe "setModel", ->
			it "should set new model to @model", ->
			it "should add listeners to the new @model", ->