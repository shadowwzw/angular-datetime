angular.module("datetime").factory("datetime", function($locale){
	// Fetch date and time formats from $locale service
	var formats = $locale.DATETIME_FORMATS;
	// Valid format tokens. 1=sss, 2=''
	var tokenRE = /yyyy|yy|y|M{1,4}|dd?|EEEE?|HH?|hh?|mm?|ss?|([.,])sss|a|Z|ww|w|'(([^']+|'')*)'/g;
	// Token definition
	var definedTokens = {
		"y": {
			minLength: 1,
			maxLength: 4,
			min: 1,
			max: 9999,
			name: "year",
			type: "number"
		},
		"yy": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 99,
			name: "year",
			type: "number"
		},
		"yyyy": {
			minLength: 4,
			maxLength: 4,
			min: 1,
			max: 9999,
			name: "year",
			type: "number"
		},
		"MMMM": {
			name: "month",
			type: "select",
			select: formats.MONTH
		},
		"MMM": {
			name: "month",
			type: "select",
			select: formats.SHORTMONTH
		},
		"MM": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "month",
			type: "number"
		},
		"M": {
			minLength: 1,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "month",
			type: "number"
		},
		"dd": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 31,
			name: "date",
			type: "number"
		},
		"d": {
			minLength: 1,
			maxLength: 2,
			min: 1,
			max: 31,
			name: "date",
			type: "number"
		},
		"EEEE": {
			name: "day",
			type: "select",
			select: fixDay(formats.DAY)
		},
		"EEE": {
			name: "day",
			type: "select",
			select: fixDay(formats.SHORTDAY)
		},
		"HH": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 23,
			name: "hour",
			type: "number"
		},
		"H": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 23,
			name: "hour",
			type: "number"
		},
		"hh": {
			minLength: 2,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "hour12",
			type: "number"
		},
		"h": {
			minLength: 1,
			maxLength: 2,
			min: 1,
			max: 12,
			name: "hour12",
			type: "number"
		},
		"mm": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "minute",
			type: "number"
		},
		"m": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "minute",
			type: "number"
		},
		"ss": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "second",
			type: "number"
		},
		"s": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 59,
			name: "second",
			type: "number"
		},
		"milliPrefix": {
			name: "milliPrefix",
			type: "regex",
			regex: /[,.]/
		},
		"sss": {
			minLength: 3,
			maxLength: 3,
			min: 0,
			max: 999,
			name: "millisecond",
			type: "number"
		},
		"a": {
			name: "ampm",
			type: "select",
			select: formats.AMPMS
		},
		"ww": {
			minLength: 2,
			maxLength: 2,
			min: 0,
			max: 53,
			name: "week",
			type: "number"
		},
		"w": {
			minLength: 1,
			maxLength: 2,
			min: 0,
			max: 53,
			name: "week",
			type: "number"
		},
		"Z": {
			name: "timezone",
			type: "regex",
			regex: /[+-]\d{4}/
		},
		"string": {
			name: "string",
			type: "static"
		}
	};

	// Push Sunday to the end
	function fixDay(days) {
		var s = [], i;
		for (i = 1; i < days.length; i++) {
			s.push(days[i]);
		}
		s.push(days[0]);
		return s;
	}

	// Use localizable formats
	function getFormat(format) {
		return formats[format] || format;
	}

	function createNode(token, value) {
		return {
			token: definedTokens[token],
			value: value,
			viewValue: value || "",
			error: null,
			offset: null,
			priority: 0
		};
	}

	// Parse format to nodes
	function createNodes(format) {
		var nodes = [],
			pos = 0,
			match;

		while (true) {
			match = tokenRE.exec(format);

			if (!match) {
				if (pos < format.length) {
					nodes.push(createNode("string", format.substring(pos)));
				}
				break;
			}

			if (match.index > pos) {
				nodes.push(createNode("string", format.substring(pos, match.index)));
				pos = match.index;
			}

			if (match.index == pos) {
				if (match[1]) {
					nodes.push(createNode("string", match[1]));
					nodes.push(createNode("sss"));
				} else if (match[2]) {
					nodes.push(createNode("string", match[2].replace("''", "'")));
				} else {
					nodes.push(createNode(match[0]));
				}
				pos = tokenRE.lastIndex;
			}
		}

		// Build relationship between nodes
		var i;
		for (i = 0; i < nodes.length; i++) {
			nodes[i].next = nodes[i + 1] || null;
			nodes[i].prev = nodes[i - 1] || null;
			nodes[i].id = i;
		}

		return nodes;
	}

	function getInteger(str, pos) {
		str = str.substring(pos);
		var match = str.match(/^\d+/);
		return match && match[0];
	}

	function getMatch(str, pos, pattern) {
		var i = 0;
		while (str[pos + i] && str[pos + i] == pattern[i]) {
			i++;
		}
		return str.substr(pos, i);
	}

	function getWeek(date) {
		var yearStart = new Date(date.getFullYear(), 0, 1);

		var weekStart = new Date(yearStart.getTime());

		if (weekStart.getDay() > 4) {
			weekStart.setDate(weekStart.getDate() + (1 - weekStart.getDay()) + 7);
		} else {
			weekStart.setDate(weekStart.getDate() + (1 - weekStart.getDay()));
		}
		var diff = date.getTime() - weekStart.getTime();

		return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
	}

	function num2str(num, minLength, maxLength) {
		var i;
		num = "" + num;
		if (num.length > maxLength) {
			num = num.substr(num.length - maxLength);
		} else if (num.length < minLength) {
			for (i = num.length; i < minLength; i++) {
				num = "0" + num;
			}
		}
		return num;
	}

	function setText(node, date, token) {
		switch (token.name) {
			case "year":
				node.value = date.getFullYear();
				break;
			case "month":
				node.value = date.getMonth() + 1;
				break;
			case "date":
				node.value = date.getDate();
				break;
			case "day":
				node.value = date.getDay();
				break;
			case "hour":
				node.value = date.getHours();
				break;
			case "hour12":
				node.value = date.getHours() % 12 || 12;
				break;
			case "ampm":
				node.value = date.getHours() < 12 ? 1 : 2;
				break;
			case "minute":
				node.value = date.getMinutes();
				break;
			case "second":
				node.value = date.getSeconds();
				break;
			case "millisecond":
				node.value = date.getMilliseconds();
				break;
			case "week":
				node.value = getWeek(date);
				break;
		}

		switch (token.type) {
			case "number":
				node.viewValue = num2str(node.value, token.minLength, token.maxLength);
				break;
			case "select":
				node.viewValue = token.select[node.value - 1];
				break;
			default:
				node.viewValue = node.value + "";
		}
	}

	function setDate(date, value, token) {
		var h;
		switch (token.name) {
			case "year":
				date.setFullYear(value);
				break;
			case "month":
				date.setMonth(value - 1);
				break;
			case "date":
				date.setDate(value);
				break;
			case "day":
				date.setDate(date.getDate() + (value - date.getDay()));
				break;
			case "hour":
				date.setHours(value);
				break;
			case "hour12":
				date.setHours((date.getHours() < 12 ? 0 : 1) * 12 + value % 12);
				break;
			case "ampm":
				h = date.getHours();
				if ((h < 12) == (value == 2)) {
					date.setHours((h + 12) % 24);
				}
				break;
			case "minute":
				date.setMinutes(value);
				break;
			case "second":
				date.setSeconds(value);
				break;
			case "millisecond":
				date.setMilliseconds(value);
				break;
			case "week":
				date.setDate(date.getDate() + (value - getWeek(date)) * 7);
				break;
		}
	}

	// Main parsing loop. Loop through nodes, parse text, update date model.
	function parseLoop(nodes, text, date) {
		var i, p, pos, value, match, j, m;
		pos = 0;
		for (i = 0; i < nodes.length; i++) {
			p = nodes[i];

			p.offset = pos;

			switch (p.token.type) {
				case "static":
					if (text.lastIndexOf(p.value, pos) != pos) {
						throw {
							message: 'Pattern value mismatch',
							pos: pos,
							text: text,
							node: p
						};
					}
					break;

				case "number":
					// Fail when meeting .sss
					value = getInteger(text, pos);
					if (value == null) {
						throw {
							message: "Invalid number",
							pos: pos,
							text: text,
							node: p
						};
					}
					if (value.length < p.token.minLength) {
						throw {
							message: "The length of number is too short",
							pos: pos,
							text: text,
							node: p
						};
					} else {
						if (value.length > p.token.maxLength) {
							value = value.substr(0, p.token.maxLength);
						}
						setDate(date, +value, p.token);
					}

					p.value = +value;
					p.viewValue = value;
					break;

				case "select":
					match = "";
					for (j = 0; j < p.token.select.length; j++) {
						m = getMatch(text, pos, p.token.select[j]);
						if (m && m.length > match.length) {
							value = j;
							match = m;
						}
					}
					if (!match) {
						throw {
							message: "Invalid select",
							pos: pos,
							text: text,
							node: p
						};
					}

					if (match != p.token.select[value]) {
						throw {
							message: "Incomplete select",
							pos: pos,
							text: text,
							node: p,
							match: match,
							match2: p.token.select[value] 
						};
					}

					setDate(date, value + 1, p.token);

					p.value = value + 1;
					p.viewValue = match;
					break;

				case "regex":
					m = p.regex.exec(text.substr(pos));
					if (!m || m.index != 0) {
						throw {
							message: "Regex doesn't match",
							text: text,
							pos: pos,
							node: p
						};
					}
					p.value = m[0];
					p.viewValue = m[0];
					break;
			}

			pos += p.viewValue.length;
		}
	}

	function createParser(format) {

		format = getFormat(format);

		var nodes = createNodes(format);

		var parser = {
			parse: function(text) {
				var date = new Date(parser.date.getTime());
				parser.error = null;
				try {
					parseLoop(parser.nodes, text, date);
				} catch (err) {
					// Should we reset date object if failed to parse?
					parser.setDate(parser.date);
					throw err;
				}
				parser.date = date;
			},
			parseNode: function(text, id) {

			},
			setDate: function(date){
				parser.date = date;

				var i, node;
				for (i = 0; i < parser.nodes.length; i++) {
					node = parser.nodes[i];

					setText(node, date, node.token);
				}
			},
			getDate: function(){
				return parser.date;
			},
			getText: function(){
				var i, text = "";
				for (i = 0; i < parser.nodes.length; i++) {
					text += parser.nodes[i].viewValue;
				}
				return text;
			},
			date: null,
			format: format,
			nodes: nodes,
			error: null
		};

		return parser;
	}

	return createParser;
});
