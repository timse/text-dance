
var fs = require("fs");

var TextDance = require("../");

new TextDance({
	video: './cowsay.mov',
	format: 'jpg',
	quality: 70,
	debug: true,
}).build(function(err, textDance){
	console.log(err);
	textDance = "<!doctype><html><head></head><body><script>"+textDance+"</script></body></html>";
	fs.writeFileSync('./cowsay.html', new Buffer(textDance));
});






