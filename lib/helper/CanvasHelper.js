"use strict";

var fs = require("graceful-fs");

var async = require("async");
var Canvas = require("canvas");
var Image = Canvas.Image;

module.exports = CanvasHelper;

function CanvasHelper(){
	this.canvas = new Canvas();
	this.image = new Image();
	this.ctx = this.canvas.getContext('2d');
}
// Takes path to image creates image filled canvas
CanvasHelper.prototype.fromImagePath = function(src, cb){

	this.image.onload = function(){

		var w = this.image.width;
		var h = this.image.height;

		this.canvas.width = w;
		this.canvas.height = h;
		this.ctx.clearRect( 0, 0, w, h );
		this.ctx.drawImage( this.image, 0, 0 );

		cb(null, this);

	}.bind(this);

	this.image.onerror = cb;

	this.image.src = src;

};

//var fromImagePathList = exports.fromImagePathList = function(list, cb){
//
//	function pathToData(path, done){
//		fromImagePath(path, done);
//	};
//
//	async.mapSeries(list, pathToData, cb);
//};


// takes a canvas and extracts image data
// if no further parameters are given the data of the whole image is returned
CanvasHelper.prototype.toImageData = function(x, y, w, h){
	x = x ||0;
	y = y ||0;
	w = w || this.canvas.width;
	h = h || this.canvas.height;

	return this.ctx.getImageData(x, y, w, h);
};

// Takes an Canvas ImageDataArray and writes it to the specified filePath
// TODO: the 'end' event seems to be happening too early, so we call it with a timeout
// there must be a nicer way to this, hopefully :p
CanvasHelper.prototype.exportImage= function(filePath, quality, cb){

	if(!cb){
		cb = quality;
		quality = 70;
	}

	var method = /jpe?g$/i.test(filePath) ? 'jpegStream' : 'pngStream';

	var out = fs.createWriteStream(filePath);

	var stream = this.canvas[method]({
		bufsize : 2048,
		quality : quality
	});

	stream.pipe(out);

	stream.on('end', function(err){
		// looks odd, is odd, but prevents weird errors
		setTimeout(cb.bind(null, err), 1000);
	});
};

//var exportImages = exports.exportImages = function(imageList, cb){
//
//	function renderImage(imageObj, done){
//		exportImage(imageObj.imageData, imageObj.fileName, imageObj.quality, done);
//	}
//	async.each(imageList, renderImage, cb);
//};

CanvasHelper.prototype.fill = function(imageData){

	this.canvas.width = imageData.width;
	this.canvas.height = imageData.height;
	this.ctx.putImageData(imageData, 0,0);

	return this;
};



