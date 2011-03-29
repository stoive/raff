define(function() {

	// unsure of whether there's a built-in way to convert characters to encoded data,
	// but since we only need ascii values for now, no big deal
	DataView.prototype.getString = function(byteOffset, len, encoding) {
		if (!encoding || encoding.toLowerCase() == "ascii") {
			var chars = [];
			for (var i = 0; i < len; i++) {
				chars[i] = String.fromCharCode(this.getUint8(byteOffset + i));
			}
			return String.fromCharCode.apply(null, chars);
		}
		else {
			throw "unknown encoding";
		}
	};

	DataView.prototype.setString = function (byteOffset, value, encoding) {
		if (!encoding || encoding.toLowerCase() == "ascii") {
			for (var i = 0; i < value.length; i++) {
				this.setUint8(byteOffset + i, value.charCodeAt(i));
			}
		}
		else {
			throw "unknown encoding";
		}
	};

	// Allows a non-integer offset to specify the location where value is saved.
	// doesn't handle the value spilling between bytes. Could be better replaced with
	// setUint1/2/4
	DataView.prototype.setBits = function (offset, value) {
		var byteOffset = Math.floor(offset);
		this.setUint8(byteOffset, this.getUint8(byteOffset) + value * Math.pow(2, 8 * (offset % 1)))
	};
	DataView.prototype.getBits = function (offset) {
		var byteOffset = Math.floor(offset);
		var bitMask = Math.pow(2, 8 * (offset % 1)) - 1;
		return (this.getUint8(byteOffset) & bitMask) / (0xff % bitMask + 1);
	};

	DataView.prototype.setUintN = function (byteOffset, value, byteLength, littleEndian) {
		// extract to 8-bit sections
		var x = value;
		var bytes = [];
		while (x > 0) {
			bytes.push(
				(x % 256)
			);
			x = Math.floor(x / 256);
		}
		while (bytes.length < byteLength) bytes.push(0);
		if (!littleEndian) bytes.reverse();
	
		for (var i in bytes) this.setUint8(byteOffset + i, bytes[i]);
	}

	DataView.prototype.getUintN = function (byteOffset, byteLength, littleEndian) {
		var val = 0;
		var bytes = [];
		for (var i = 0; i < byteLength; i++) bytes.push(this.getUint8(byteOffset + i));
		if (!littleEndian) bytes.reverse();
	
		// append 8-bit sections to each other
		for (var n in bytes) val += bytes[n] * Math.pow(2, 8 * n);
		return val; 
	}

	function BmpFile(width, height, colourDepth) {
		this.bmpHeader = new BmpHeader();
		this.dibHeader = new DibHeader();
		this.imageData = new PixelData(width, height, colourDepth);
		if (colourDepth <= 8) this.palette = new ColourTable();
	
		this.dibHeader.imageWidth = width;
		this.dibHeader.imageHeight = height;
		this.dibHeader.colourDepth = colourDepth;
		this.dibHeader.imageDataBytes = this.imageData.byteLength
	}
	BmpFile.prototype = {
		bmpHeader: null,
		dibHeader: null,
		palette: null,
		imageData: null,
		get bytes() {
			this.bmpHeader.imageDataOffset = 
				this.bmpHeader.bytes.buffer.byteLength +
				this.dibHeader.bytes.buffer.byteLength +
				(this.palette ? this.palette.byteLength : 0);
	
			this.bmpHeader.fileSize = 
		 		this.bmpHeader.imageDataOffset +
				this.imageData.byteLength;

			var dv = new DataView(new ArrayBuffer(this.bmpHeader.fileSize));
			var bytesWritten = 0;

			var i = -1;
			while (++i < this.bmpHeader.bytes.buffer.byteLength) {
				dv.setUint8(bytesWritten + i, this.bmpHeader.bytes.getUint8(i))
			}
			bytesWritten += this.bmpHeader.bytes.buffer.byteLength;

			i = -1;
			while (++i < this.dibHeader.bytes.buffer.byteLength) {
				dv.setUint8(bytesWritten + i, this.dibHeader.bytes.getUint8(i));
			}
			bytesWritten += this.dibHeader.bytes.buffer.byteLength;		

			if (this.palette) {
				i = -1;
				var paletteBytes = this.palette.bytes;
				while (++i < paletteBytes.buffer.byteLength) {
					dv.setUint8(bytesWritten + i, paletteBytes.getUint8(i));
				}
				bytesWritten += paletteBytes.buffer.byteLength;
			}

			i = -1;
			var imageDataBytes = this.imageData.bytes;
			while (++i < imageDataBytes.buffer.byteLength) {
				dv.setUint8(bytesWritten + i, imageDataBytes.getUint8(i));
			}
			return dv;
		}
	};

	// Implements BITMAPFILEHEADER
	function BmpHeader() {
		this.bytes = new DataView(new ArrayBuffer(14));
		this.magicNumber = "BM";
	}
	BmpHeader.prototype = {
		bytes: null,
		get magicNumber() {
			return this.bytes.getString(0,2);
		},
		set magicNumber(value) {
			if (value.length == 2)
				this.bytes.setString(0,value);
			else
				throw "magicNumber must have length of exactly 2 characters"
		},
		get fileSize() {
			return this.bytes.getUint32(2, true);
		},
		set fileSize(value) {
			this.bytes.setUint32(2, value, true);
		},
		get reserved1() {
			return this.bytes.getUint16(6, true);
		},
		set reserved1(value) {
			this.bytes.setUint16(6, value, true);
		},
		get reserved2() {
			return this.bytes.getUint16(8, true);
		},
		set reserved2(value) {
			this.bytes.setUint16(8, value, true);
		},
		get imageDataOffset() {
			return this.bytes.getUint32(10, true);
		},
		set imageDataOffset(value) {
			this.bytes.setUint32(10, value, true);
		}
	};
	BmpHeader.prototype.constructor = BmpHeader;

	// implementation of BITMAPINFOHEADER
	function DibHeader() {
		this.bytes = new DataView(new ArrayBuffer(40));
		this.headerSize = 40;
		this.horizontalPixelsPerMetre = 2835;
		this.verticalPixelsPerMetre = 2835,
		this.colourPlanes = 1;
		this.colourDepth = 1;
	}
	DibHeader.prototype = {
		bytes: null,
		get headerSize() {
			return this.bytes.getUint32(0, true);
		},
		set headerSize(value) {
			this.bytes.setUint32(0, value, true);
		},
		get imageWidth() {
			return this.bytes.getUint32(4, true);
		},
		set imageWidth(value) {
			this.bytes.setUint32(4, value, true);
		},
		get imageHeight() {
			return this.bytes.getUint32(8, true);
		},
		set imageHeight(value) {
			this.bytes.setUint32(8, value, true);
		},
		get colourPlanes() {
			return this.bytes.getUint16(12, true);
		},
		set colourPlanes(value) {
			this.bytes.setUint16(12, value, true);
		},
		get colourDepth() {
			return this.bytes.getUint16(14, true);
		},
		set colourDepth(value) {
			this.bytes.setUint16(14, value, true);
		},
		get compressionMethod() {
			return this.bytes.getUint32(16, true);
		},
		set compressionMethod(value) {
			this.bytes.setUint32(16, value, true);
		},
		get imageDataBytes() {
			return this.bytes.getUint32(20, true);
		},
		set imageDataBytes(value) {
			this.bytes.setUint32(20, value, true);
		},
		get horizontalPixelsPerMetre() {
			return this.bytes.getUint32(24, true);
		},
		set horizontalPixelsPerMetre(value) {
			this.bytes.setUint32(24, value, true);
		},
		get verticalPixelsPerMetre() {
			return this.bytes.getUint32(28, true);
		},
		set verticalPixelsPerMetre(value) {
			this.bytes.setUint32(28, value, true);
		},
		get paletteSize() {
			return this.bytes.getUint32(32, true);
		},
		set paletteSize(value) {
			this.bytes.setUint32(32, value, true);
		},
		get importantColours() {
			return this.bytes.getUint32(36, true);
		},
		set importantColours(value) {
			this.bytes.setUint32(36, value, true);
		}
	};
	DibHeader.prototype.constructor = DibHeader;

	// Gives a RGBA value according to a specified length and mask
	function RGBAXColourFactory(bits, redMask, greenMask, blueMask, alphaMask) {
		this.bits = bits;
		this.redMask = redMask;
		this.greenMask = greenMask;
		this.blueMask = blueMask;
		this.alphaMask = alphaMask;
	}
	RGBAXColourFactory.prototype = {
		bits: 0,
		redMask: 0x0,
		greenMask: 0x0,
		blueMask: 0x0,
		alphaMask: 0x0,
		createColour: function(red, green, blue, alpha) {
			var val = 0x0;
			val += red * (Math.pow(2, this.bits) % this.redMask);
			val += green * (Math.pow(2, this.bits) % this.greenMask);
			val += blue * (Math.pow(2, this.bits) % this.blueMask);
			if (this.alphaMask) val += alpha * (Math.pow(2,this.bits) % this.alphaMask);
			return val;
		}
	};

	// BITMAPINFOHEADER only supports 24 bit colour for non-indexed bitmaps. Add as appropriate
	// Possibly extend RGBAXColourFactory to have a bytes property to output extended portion of header
	// which is necessary for DIB headers not implemented here.
	// The identifiers here are descriptive, assign them short names for the sake of your carpel tunnel syndrome
	// e.g. var cf = RGBAXColourFactories.TwentyFourBitColourFactory; cf.c = cf.createColour; //  cf.c(0,255,127);
	var RGBAXColourFactories = {
		TwentyFourBitColourFactory: new RGBAXColourFactory(24,0xff,0xff00, 0xff0000),
		RGBQUADColourFactory: new RGBAXColourFactory(32, 0xff00, 0xff0000, 0xff000000)
	};

	// ColourTable is an array of RGBQUAD colour values
	function ColourTable() {}
	ColourTable.prototype = [];
	ColourTable.prototype.constructor = ColourTable;
	Object.defineProperty(ColourTable.prototype, "bytes",{
		get: function() {
			var a = new DataView(new ArrayBuffer(this.byteLength))
			var i = 0;
			while (i < this.length) {
				a.setUint32(i * 4, this[i], false);
				++i;
			}
			return a;
		},
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(ColourTable.prototype, "getIndex",{
		value: function(colour) {
			return this.indexOf(colour);
		},
		writable: true,
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(ColourTable.prototype, "byteLength",{
		get: function() {
			return this.length * 4;
		},
		enumerable: false,
		configurable: true
	});

	// There needs to be added default colour tables for 2, 4, 8 bit bitmaps
	ColourTables = {
		get MonochromeColourTable() {
			var colourTable = new ColourTable();	
			colourTable.push(RGBAXColourFactories.RGBQUADColourFactory.createColour(0xff,0xff,0xff,0x00));
			colourTable.push(RGBAXColourFactories.RGBQUADColourFactory.createColour(0x00,0x00,0x00,0x00));
			return colourTable;
		}
	};

	// e.g.
	// pixelData[0][1] = RGBAXColourFactories.TwentyFourBitColourFactory.createColour(34,43,2,0);
	// pixelData[23][34] = colourTable[1];
	function PixelData(width, height, colourDepth) {
		this.width = width;
		this.height = height;
		this.colourDepth = colourDepth;

		// zero out array
		// creates a new row every time instead of referencing
		var zeroRow = function() { row = []; for (var x = 0; x < width; x++) row[x] = 0; return row};
		for (var y = 0; y < height; y++) this.push(zeroRow());
	}
	PixelData.prototype = [];
	PixelData.prototype.constructor = PixelData;
	Object.defineProperty(PixelData.prototype, "width", {
		value: 0,
		writable: true,
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(PixelData.prototype, "height", {
		value: 0,
		writable: true,
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(PixelData.prototype, "colourDepth", {
		value: 0,
		writable: true,
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(PixelData.prototype, "bytesWide", {
		get: function() {
			return Math.ceil(((this.colourDepth / 8) * this.width) / 4) * 4;
		},
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(PixelData.prototype, "byteLength", {
		get: function() {
			return this.bytesWide * this.height;
		},
		enumerable: false,
		configurable: true
	});
	Object.defineProperty(PixelData.prototype, "bytes",{
		get: function() {
			var setInt;
			var getInt;
			var accessorSize;
			if (this.colourDepth <= 4) {
				var self = this;
				// currying the setBits function to permanently set len parameter
				// thus creating setUint4, setUint2, setUint1, setUint'self.colourDepth' equivalents
				// where offset may be a fraction of a byte
				setInt = DataView.prototype.setBits;
				getInt = DataView.prototype.getBits;
				accessorSize = 8;
			}
			if (this.colourDepth == 8) {
				setInt = DataView.prototype.setUint8;
				getInt = DataView.prototype.getUint8;
				accessorSize = 8;
			}
			else if (this.colourDepth == 16) {
				setInt = DataView.prototype.setUint16;
				getInt = DataView.prototype.getUint16;
				accessorSize = 16;
			}
			else if (this.colourDepth == 24) {
				setInt = function(index, value, littleEndian) {
					return DataView.prototype.setUintN.call(this, offset, value, 3, littleEndian);
				};
				getInt = function(index, littleEndian) {
					return DataView.prototype.getUintN.call(this, offset, 3, littleEndian);
				};
				accessorSize = 24;
			}
			else if (this.colourDepth == 32) {
				setInt = DataView.prototype.setUint32;
				getInt = DataView.prototype.getUint32;
				accessorSize = 32;
			}

			var a = new DataView(new ArrayBuffer(this.byteLength));
			var i = 0;
			for (var y = this.height - 1; y >= 0; y--) {
				for (var x = 0; x < this.width; x++) {
					// calculate the byte index of a pixel coordinate
					setInt.call(a, Math.floor(i) + (1 - i % 1 - this.colourDepth / accessorSize), this[y][x]);
					i += this.colourDepth / 8;
				}
				i = this.bytesWide * (this.height - y);
			}
		
			return a;
		},
		enumerable: false,
		configurable: true
	});
});
