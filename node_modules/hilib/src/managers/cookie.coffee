# //** COOKIE MANAGER **// Credits: http://www.quirksmode.org/js/cookies.html

module.exports =
	get: (name) ->
		nameEQ = name + "="

		for c in document.cookie.split ';'
			c = c.substring 1, c.length while c.charAt(0) is ' ' 

			return c.substring nameEQ.length, c.length if c.indexOf(nameEQ) is 0 

	set: (name,value,days) ->
		if (days)
			date = new Date()
			date.setTime date.getTime()+(days*24*60*60*1000)
			expires = "expires="+date.toGMTString()
		else 
			expires = ""

		document.cookie = "#{name}=#{value}; #{expires}; path=/"

	remove: (name) ->
		this.set name, "", -1