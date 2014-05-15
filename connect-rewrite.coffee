fs = require 'fs'
path = require 'path'
gutil = require 'gulp-util'

module.exports = (connect, options) ->
	[
		(req, res, next) ->
			contentTypeMap =
				'.html': 'text/html'
				'.css': 'text/css'
				'.js': 'application/javascript'
				'.map': 'application/javascript' # js source maps
				'.json': 'application/json'
				'.gif': 'image/gif'
				'.jpg': 'image/jpeg'
				'.jpeg': 'image/jpeg'
				'.png': 'image/png'
				'.ico': 'image/x-icon'
				'.svg': 'image/svg+xml'
				'.woff': 'application/font-woff'
				'.ttf': 'application/x-font-ttf'

			sendFile = (reqUrl) ->
				filePath = path.join options.root, reqUrl

				res.writeHead 200,
					'Content-Type': contentTypeMap[extName] || 'text/html'
					'Content-Length': fs.statSync(filePath).size

				readStream = fs.createReadStream filePath
				readStream.pipe res

			
			requrl = if req.url.lastIndexOf('?') > -1 then req.url.slice 0, req.url.lastIndexOf('?') else req.url
			extName = path.extname requrl

			# If request is a file and it doesnt exist, pass req to connect
			if contentTypeMap[extName]? and not fs.existsSync(options.root + req.url)
				next()
			else if contentTypeMap[extName]?
				sendFile req.url
			else
				sendFile 'index.html'
	]