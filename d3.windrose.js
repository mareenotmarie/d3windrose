/**
 * @namespace windrose
 */
var windrose = 
{
	/**
	 * The number of degrees in a circle, used with rotations calculations for SVG transpose attributes
	 * @property degreesInCircle
	 * @type int
	 * @default 360
	 */
	degreesInCircle: 360,
	/**
	 * @method getDirections
	 * @param data The javascript object/ json holding the windrose data
	 * @return an array of directions e.g. N, NE, .. that are used as first-level keys in the data
	 */
	getDirections: function(data) {
		directions = [];
		for(key in data) {
			if(key !== "calm") {
				directions.push(key);
			}
		}
		return directions;
	},
	/**
	 * Wind speed bin fill color config
	 * @property config The object that holds the fill color for each wind speed bin
	 * @type Object
	 */
	config: { 	
		"0-10": { "fill": "#FFFF99"},
		"10-20": { "fill": "#FFFF33"},
		"20-30": { "fill": "#FFCC00" },
		">30": { "fill": "#FF9900"}
	},
	/**
	 * @method getAngles Determines the start and end angles for windrose arcs based on the length of the directions array
	 * @param {array} directional bins for this windrose e.g ["N", "NE", ... "W", "NW"]
	 * @returns {Object} an object containing an object for each direction with start and end angle attributes (floats)
	 */
	getAngles: function(directions) { 
		var slices = directions.length;
		var factor =  -0.5; // North start at halfway mark between N and NW or NNW
		var angs = {};
		for(var i in directions) {
			angs[directions[i]] = { "start": (windrose.degreesInCircle/slices*factor), "end": (windrose.degreesInCircle/slices*(++factor)) };
		}
		return angs;
	},
	/**
	 * @method numberOfDirectionsInData Determines the number of directions in the wind rose data (not calm)
	 * @param {object} data The wind rose data object
	 * @returns {int} The number of directional bins in the wind rose data object
	 */
	numberOfDirectionsInData: function(data) {
		var count = 0;
		for(key in data) {
			count++
		}
		return count;
	},
	/**
	 * @method maxLength returns the maximum length of a directional 'arm' of the wind rose
	 * @param {object} data The wind rose data object
	 * @returns {int} the maximum length of a directional 'arm' of the wind rose
	 */
	maxLength: function(data) {
		var max = 0;
		function gt(val) { if(val > max) { max = val; }};
		var calm = 0;
		var len = 0;
		for(var dir in data) {
			if(dir === "calm") { calm = data[dir]; }
			else { 
				len = 0;
				for(var bin in data[dir]) { 
					len+=data[dir][bin];
				}
			}
			gt(len+calm); 
		}
		return max;
	},
	directionWithMinimumLength: function(data) {
		var min = 0;
		var mindir = "";
		function lt(val, dir) { if(val < min) { min = val; mindir = dir; }};
		var len = 0;
		for(var dir in data) {
			if(dir === "calm") { calm = data[dir]; }
			else { 
				len = 0;
				for(var bin in data[dir]) { 
					len+=data[dir][bin];
				}
			}
			lt(len+calm, dir); 
		}
		return mindir;
	},
	/**
	 * @method domain Returns the 10-based value of the last radial axes for the wind rose data
	 * @param {object} data The wind rose data object
	 * @retunrs {int} The 10-based value of the last radial axes for the wind rose
	 */
	domain: function(data) { return Math.ceil(windrose.maxLength(data) / 10) * 10; },
	/** 
	 * @method drawFrequencyCircles Draws the radial axes for a frequency based wind rose
	 * @param {int} domain The 10-based value of the last radial axes for the wind rose, from windrose.domain
	 * @param {object} center the x and y values of the center coordines of the wind rose
	 * @param {object} svgContainer the html element that is the svg container for the wind rose
	 */
	drawFrequencyCircles: function(domain, center,svgContainer)
	{
		for (var freq = domain; freq >= 5; freq-=10)
		{
			svgContainer.append("circle")
						.attr("cx", center.x)
						.attr("cy", center.y)
						.attr("r", freq)
						.style("fill", "white")
						.style("stroke", "#C8C8C8")
						.append("title").text(freq + "%");

			svgContainer.append("text")
				.attr("x", center.x)
				.attr("y", center.y + freq)
				.attr("fill", "#C0C0C0")
				.attr("font-size", "5pt")
				.attr("font-family", "Arial")
				.text(freq + "%")
				.attr('transform', "rotate(-22.5 " + center.x + " " + center.y + ")");
		}
	},
	/**
	 * @method drawChunk draws a 'chuck' or single arc of the wind rose, several chunks can make up a directional arm
	 * @param {string} dir The direction the chunk will be drawn for
	 * @param {string} bin The speed bin the chunk will be drawn for
	 * @param {float} freq The wind speed frequency or width of the arc to be drawn for this chunk
	 * @param {int} offset The offset from the center for this direction and speed bin for the arc to be drawn
	 * @param {object} center The x and y coordinates of the center of the wind rose
	 * @param {object} angles The object which holds start and end angles for the arc for this direction
	 * @param {object} svgContainer The svg html element to which the wind rose is drawn
	 * @param {int} returns the new offset value (given offset plus width of this chunk/arc)
	 */
	drawChunk: function(dir, bin, freq, offset, center, angles, svgContainer)
	{	
		var arc = d3.svg.arc()	
			.innerRadius(offset)
			.outerRadius(offset + freq)
			.startAngle(windrose.rad(angles[dir].start))
			.endAngle(windrose.rad(angles[dir].end))

		svgContainer.append("path")
			.attr("d", arc)
			.attr("fill", windrose.config[bin]["fill"])
			.attr("fill-opacity", 0.5)
			.style("stroke", "black")
			.attr("transform", "translate(" + center.x + "," + center.y + ")")
			.append("title")
			.text("" + dir + " " + bin + " m/s " + freq + "%");	

		return offset + freq;
	},	
	/**
	 * @method drawRose Draws the standard wind rose for the given data, svg 'canvas' and center coordinates
	 * @param {object} data The wind rose data object
	 * @param {object} center The x and y coordinates of the center of the wind rose
	 * @param {object} svgContainer The svg html element the wind rose is drawn to
	 */
	drawRose: function(data, center, svgContainer) { 
		data = typeof data !== 'undefined' ? data: { 	"calm": 8,
					"N": { "0-10": 3, "10-20": 12, "20-30": 0, ">30": 0 },
					"NNE": { "0-10": 4, "10-20": 9, "20-30": 2, ">30": 0 },
					"NE": { "0-10": 0, "10-20": 20, "20-30": 0, ">30": 0 },
					"ENE": { "0-10": 0, "10-20": 2, "20-30": 0, ">30": 0 },
					"E": { "0-10": 0, "10-20": 5, "20-30": 0, ">30": 0 },
					"ESE": { "0-10": 0, "10-20": 5, "20-30": 0, ">30": 0 },					
					"SE": { "0-10": 0, "10-20": 0, "20-30": 0, ">30": 0 },
					"SSE": { "0-10": 0, "10-20": 0, "20-30": 0, ">30": 0 },
					"S": { "0-10": 20, "10-20": 30, "20-30": 10, ">30": 10 },
					"SSW": { "0-10": 23, "10-20": 0, "20-30": 0, ">30": 0 },
					"SW": { "0-10": 23, "10-20": 0, "20-30": 0, ">30": 0 },
					"WSW": { "0-10": 0, "10-20": 11, "20-30": 0, ">30": 0 },
					"W": { "0-10": 0, "10-20": 11, "20-30": 0, ">30": 0 },
					"WNW": { "0-10": 0, "10-20": 11, "20-30": 0, ">30": 0 },
					"NW": { "0-10": 0, "10-20": 0, "20-30": 0, ">30": 0 },
					"NNW": { "0-10": 0, "10-20": 0, "20-30": 0, ">30": 0 } 
				};
		// default values
		center = typeof center !== 'undefined' ? center : {x: 100,y: 80};
		svgContainer = typeof svgContainer !== 'undefined' ? svgContainer : d3.select("body").append("svg")
									.attr("width", 300)
									.attr("height", 300);
		// draw the radial axes for the wind speed frequencies
		windrose.drawFrequencyCircles(windrose.domain(data), center,svgContainer);
		// determine the start and end angles used to draw the arcs ('chunks' of each directional 'arm')
		var directions = windrose.getDirections(data);
		var angles = windrose.getAngles(directions);
		// for each direction to be drawn
		for(var dir in data) {
			if(dir !== "calm") {
				var offset = data["calm"]; 	
				// for each speed bin 'chunk'
				for(var bin in data[dir])
				{	
					// draw the wind speed bin 'chunk' of each direction, keeping track of the offset 
					// along the direction axis for the next 'chunk' to use
					offset = windrose.drawChunk(dir, bin, data[dir][bin], offset, center, angles, svgContainer);
				}
			}
		}
	},
	/**
	 * @namespace windrose.bomStyle The windrose type BOM-style (Bureau of Meteorology) uses telescope arms for directional axes
	 */
	bomStyle:
	{
		/**
		 * @property config The wind speed bin fill colour and telescope width for the BOM-style wind rose
		 */
		config: { 	
			"0-10": { "fill": "#FFFF99", "width": 4 },
			"10-20": { "fill": "#FFFF33", "width": 8 },
			"20-30": { "fill": "#FFCC00", "width": 12 },
			">30": { "fill": "#FF9900", "width": 16 }
		},
		/**
		 * @method drawRadiiCircles Draws the radial axes for the BOM-style wind rose
		 * @param {int} domain The 10-based value of the outer radial axis line
		 * @param {object} center The x and y coordinates of the center point of the wind rose
		 * @param {object} svgContainer The svg html element that the wind rose is drawn to
		 */
		drawRadiiCircles: function(domain, center, svgContainer)
		{
			for (var radius = domain; radius >= 10; radius-=10)
			{
				svgContainer.append("circle")
							.attr("cx", center.x)
							.attr("cy", center.y)
							.attr("r", radius)
							.style("fill", "white")
							//.style("stroke-dasharray", "5,5")
							//.style("stroke", "black");
							.style("stroke", "#C8C8C8");
			}
		},
		/**
		 * @method drawCalmCircle Draws the center circle that represents the frequency when the wind is calm (0 units)
		 * @param {float} calmPercent The frequency when the wind is calm
		 * @center {object} The x and y coordinates of the center of the wind rose
		 * @svgContainer {object} The svg html element the wind rose is drawn to
		 */
		drawCalmCircle: function(calmPercent, center, svgContainer)
		{
			svgContainer.append("circle")
							.attr("cx", center.x)
							.attr("cy", center.y)
							.attr("r", calmPercent)
							.style("fill", "white")
							.style("stroke", "black")
							.append("title")
							.text("Calm: " + calmPercent + "%");
		},
		/**
		 * @method drawRose Draws the BOM-style wind rose
		 * @param {object} data The wind rose data object
		 * @param {object} center The x and y coordinates of the center of the wind rose
		 * @param {object} svgContainer The svg html element the wind rose is drawn to
		 */
		drawRose: function(data, center, svgContainer) { 
			data = typeof data !== 'undefined' ? data: { 	"calm": 8,
					"N": { "0-10": 10, "10-20": 10, "20-30": 10, ">30": 10 },
					"NE": { "0-10": 10, "10-20": 10, "20-30": 10, ">30": 10 },
					"E": { "0-10": 10, "10-20": 10, "20-30": 10, ">30": 10 },
					"SE": { "0-10": 10, "10-20": 10, "20-30": 10, ">30": 10 },
					"S": { "0-10": 20, "10-20": 30, "20-30": 10, ">30": 10 },
					"SW": { "0-10": 10, "10-20": 10, "20-30": 10, ">30": 10 },
					"W": { "0-10": 10, "10-20": 10, "20-30": 10, ">30": 10 },
					"NW": { "0-10": 10, "10-20": 10, "20-30": 10, ">30": 10 } 
				};
			center = typeof center !== 'undefined' ? center : {x: 100,y: 80};
			svgContainer = typeof svgContainer !== 'undefined' ? svgContainer : d3.select("body").append("svg")
									.attr("width", 300)
									.attr("height", 300);
			windrose.bomStyle.drawRadiiCircles(windrose.domain(data), center, svgContainer);
			windrose.bomStyle.drawCalmCircle(data["calm"], center, svgContainer);
			var rotations = { 	"N": 180,
					"NE": -90 - 45,
					"E": -90,
					"SE": -45,
					"S": 0,
					"SW": 45,
					"W": 90,
					"NW": 90+45 
				};
			
			var offset = center.y + data["calm"];

			for(var dir in data)
			{
				var currentOffset = offset;	
				if(dir !== "calm") {
					for(var key in data[dir])
					{				
						var rotation = "rotate(" + rotations[dir] + " " +  center.x + " " + center.y + ")";
						rect = svgContainer.append("rect")
								.attr("x", (center.x - (windrose.bomStyle.config[key]["width"]/2)))
								.attr("y", currentOffset)
								.attr("width", windrose.bomStyle.config[key]["width"])
								.attr("height", data[dir][key])
								.attr("transform", rotation)
								.style("fill", windrose.bomStyle.config[key]["fill"])
								.style("stroke", "black")
								.append("title")
									.text("Direction: "+dir+" Wind speed bin: " + key + " km/h Frequency: " + data[dir][key] + "%");			
						currentOffset+=data[dir][key];
					}
				}
			}
		}
	},
	/**
	 * @namespace windrose.meanDirectional
	 */
	meanDirectional: {
		/**
		 * @method drawSpeedCircles Draws the radial axes representing wind speed
		 * @param {object} svgContainer The svg html element the wind rose is drawn to
		 * @param {object} center The x and y coordinates of the center of the wind rose
		 */
		drawSpeedCircles: function(svgContainer, center)
		{
			for (var speed = 80; speed >= 5; speed-=10)
			{
				svgContainer.append("circle")
							.attr("cx", center.x)
							.attr("cy", center.y)
							.attr("r", speed)
							.style("fill", "white")
							//.style("stroke", "black")
							.style("stroke", "#C8C8C8");
							//.style("stroke-dasharray", "5,5");
			}
		},
		/**
		 * @method drawSpeedSlice Draws the wind speed frequency slice for the given direction
		 * @param {object} svgContainer The svg html element the wind rose is drawn to
		 * @param {object} center The x and y coordinates of the center of the wind rose
		 * @param {string} dir The direction for this speed slice
		 * @param {float} speed The speed for this direction
		 * @param {object} angles The start and end angles for drawing the wind rose speed slices
		 */
		drawSpeedSlice: function(svgContainer, center, dir, speed, angles)
		{	
			var arc = d3.svg.arc()	
				.innerRadius(0)
				.outerRadius(speed)
				.startAngle(windrose.rad(angles[dir].start))
				.endAngle(windrose.rad(angles[dir].end))

			svgContainer.append("path")
				.attr("d", arc)
				.attr("fill", "green")
				.attr("fill-opacity", 0.5)
				.style("stroke", "black")
				.attr("transform", "translate(" + center.x + "," + center.y + ")")
				.append("title")
					.text("" + dir + " average wind speed is " + speed + "m/s");	
		}, 
		/**
		 * @method drawRose Draw the mean directional wind rose
		 * @param {object} data The wind rose data object
		 * @param {object} center The x and y coordinate of the center of the wind rose
		 * @param {object} svgContainer The svg html element the wind rose is drawn to
		 */
		drawRose: function(data, center, svgContainer) {
			// default arguments
			data = typeof data !== 'undefined' ? data: {
				"N": 10,
				"NE": 20,
				"E": 30,
				"SE": 40,
				"S": 50,
				"SW": 60,
				"W": 70,
				"NW": 80
			};
			center = typeof center !== 'undefined' ? center : {x: 100,y: 80};
			svgContainer = typeof svgContainer !== 'undefined' ? svgContainer : d3.select("body").append("svg")
									.attr("width", 300)
									.attr("height", 300);
			// determine the start and end angles for wind rose directions
			var directions = windrose.getDirections(data);
			var angles = windrose.getAngles(directions);
			// draw the mean directional wind rose's radial axes representing wind speed
			windrose.meanDirectional.drawSpeedCircles(svgContainer, center);
			// for each direction, draw the mean directional speed slice
			for(var dir in data)
			{
				windrose.meanDirectional.drawSpeedSlice(svgContainer, center, dir, data[dir], angles);
			}	
		}
	},	
	/**
	 * @method rad Converts degrees to radians 
	 * @return {float} The radians equivalent of the supplied degrees value
	 */
	rad: function(deg)
	{
		return deg * (Math.PI/180);
	}
};
