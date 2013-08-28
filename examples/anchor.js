
var fs = require("fs");

var TextDance = require("../");

new TextDance({
	video: './cowsay.mov',
	format: 'jpg',
	quality: 70,
	debug: true,
	anchor: '#anchor'
}).build(function(err, textDance){
	fs.writeFileSync('./anchor-example.js', new Buffer(textDance));
});






