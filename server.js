import express from 'express';
import path from 'path';
const __dirname = path.resolve();
const PORT = process.env.PORT || 8000
var app = express()

app.enable('trust proxy');

app.use (function (req, res, next) {
	if (req.secure || req.hostname == "localhost") {
		next();
	} else {
		res.redirect('https://' + req.headers.host + req.url);
	}
});

app
.use('/', express.static(__dirname))
.listen(PORT, () => console.log(`Listening on ${PORT}`));