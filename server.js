import express from 'express';
import path from 'path';
const __dirname = path.resolve();
const PORT = process.env.PORT || 8000

express()
.use('/', express.static(__dirname))
.listen(PORT, () => console.log(`Listening on ${PORT}`));