"use strict";

//var canvas = require('./helper/canvas');
var Canvas = require('canvas');

var utils = require('./utils');

module.exports = FrameDifference;

function FrameDifference(a, b, tolerance){

	// imageData of the canvas
	this.imageData = {
		a: a.toImageData(),
		b: b.toImageData()
	};

	this.tolerance = tolerance;

}

FrameDifference.prototype.calculateDifference = function(){

	var a = this.imageData.a.data;
	var b = this.imageData.b.data;
	var t = this.tolerance.color;
	this.differentPixels = [];
	this.differenceMap = [];

	var i, len;
	for(i=0, len = a.length; i < len; i += 4){

		// check if any of the difference between color values
		// is above the threshold ( tolerance.color )
		/* this code runs alot, so i tought it might be worth the ugliness
		 * its basically a faster version of this code:
		 *
		 * 		var red = Math.abs(a[ i ] - b[ i ]) > tolerance;
		 * 		var green = Math.abs(a[ i + 1 ] - b[ i + 1 ]) > tolerance;
		 * 		var blue = Math.abs(a[ i + 2 ] - b[ i + 2 ]) > tolerance;
		 * 		var alpha = Math.abs(a[ i + 3 ] - b[ i + 3 ]) > tolerance;
		 *
		 *		if( red || green || blue || alpha){
		 *			...
		 *
		 * works for unsigned 32 bit integers,
		 * taken and slightly amended from
		 * http://graphics.stanford.edu/~seander/bithacks.html
		*/
		if( ((a[ i ] - b[ i ]) ^ (2*(a[ i ] - b[ i ]) >> 31)) > t ||
			((a[ i + 1] - b[ i + 1]) ^ (2*(a[ i + 1] - b[ i + 1]) >> 31)) > t ||
			((a[ i + 2] - b[ i + 2]) ^ (2*(a[ i + 2] - b[ i + 2]) >> 31)) > t ||
			((a[ i + 3] - b[ i + 3]) ^ (2*(a[ i + 3] - b[ i + 3]) >> 31)) > t){

			// store all different pixels
			this.differentPixels.push(i/4);

			// create a map of different pixels
			this.differenceMap[i/4] = true;
		}
	}

	return this;
};

// take in an array of pixel indizes that were different between the two images and tries to find clusters
FrameDifference.prototype.createCluster = function(){

	var map = this.getDifferenceMap();
	var pixels = this.getDifferentPixels();

	var from = -this.tolerance.cluster -1;
	var to = this.tolerance.cluster + 2;

	var width = this.imageData.a.width;

	this.clusters = [];

	// iterate over all different pixels and create clusters
	var i, len, j, k, px, cluster, pntr, currentPx, sibl;
	for( i=0, len = pixels.length; i < len ; i += 1){

		// take the first or the next found difference
		px = pixels[i];

		// check if this was processed before
		// every processed index will be set to false and fail this check
		if(!map[px]){ continue; }

		// all pixels found for the cluster get here
		// we start with the current pixel and add each new pixel found.
		//
		// this array is also used to determine if we still need to check
		cluster = [px];

		// pointer that points to the currently checked pixel
		pntr = 0;

		// if the pointer is as big as the cluster length we are done
		while(pntr !== cluster.length){

			// take the first/next pixel to check for siblings
			currentPx = cluster[pntr];
			pntr += 1;

			// iterate a square (size according to the tolerance) around the pixel and check for unknown siblings
			for( j = from; j < to; j += 1){
				for( k = from; k < to; k += 1){

					// calculate the current index to check for a difference
					sibl = currentPx + j * width + k;

					// if a difference exist, add the pixel to the cluster
					// flag it as processed
					if(map[sibl]){
						cluster.push(sibl);
						map[sibl] = false;
					}
				}
			}
		}

		this.clusters.push(cluster);
	}

	return this;
};

// takes a 1d array treats it like a 2d array by width
// gets the boundaries (left, top, width, height)  and the density (number of points in that space) of the points in the array
// returns an obj with the attributes: "left", "top", "width", "height" and "density"
FrameDifference.prototype.createBoundaries = function(){

	var clusters = this.getClusters();
	var width = this.imageData.a.width;

	this.boundaries = clusters.map(function(cluster){

		var px = cluster[0];
		var row = ~~(px/width);
		var column = px%width;
		var left = column;
		var right = column;
		var top = row;
		var bottom = row;


		var i, len;
		for( i=1, len = cluster.length; i < len; i+= 1){

			px = cluster[i];
			row = ~~(px/width);
			column = px%width;

			// check if we have a new max/min value
			if( column < left ){
				left = column;
			}
			if( column > right ){
				right = column;
			}
			if(row < top){
				top = row;
			}
			if(row > bottom){
				bottom = row;
			}
		}

		return {
			data: cluster,
			top: top,
			left: left,
			width: right - left + 1,
			height: bottom - top + 1
		};
	});

	return this;

};

FrameDifference.prototype.getBoundaries = function(){
	return this.boundaries = this.boundaries || this.createBoundaries().getBoundaries();
};

FrameDifference.prototype.getClusters = function(){

	return this.clusters = this.clusters || this.createCluster().getClusters();
};

FrameDifference.prototype.getDifferentPixels = function(){
	return this.differentPixels = this.differentPixels || this.calculateDifference().getDifferentPixels();
};

FrameDifference.prototype.getDifferenceMap = function(){
	return this.differenceMap = this.differenceMap || this.calculateDifference().getDifferenceMap();
};


//FrameDifference.prototype.debugPixels = function(){
//	var cvs = canvas.filled(this.data.a);
//	var ctx = cvs.getContext('2d');
//	ctx.fillStyle = 'red';
//
//	this.differentPixels.forEach(function drawPx(index){
//		var x = index % this.width;
//		var y = ~~(index/this.width);
//		ctx.fillRect(x, y, 1, 1);
//	}.bind(this));
//
//	return canvas.imageData(cvs, 0, 0, cvs.width, cvs.height);
//};
//
//FrameDifference.prototype.debugClusters = function(){
//
//	var cvs = canvas.filled(this.data.a);
//	var ctx = cvs.getContext('2d');
//	ctx.fillStyle = 'red';
//
//	this.clusters.forEach(function drawDiff(cluster){
//
//		var b = cluster.boundary;
//		ctx.fillRect(b.left, b.top, b.width, b.height);
//
//	}.bind(this));
//
//	return canvas.imageData(cvs, 0, 0, cvs.width, cvs.height);
//};






