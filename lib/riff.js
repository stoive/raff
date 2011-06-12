define(function() {
	var chunk = function(ckID, ckSize, buffer, offset) {
		if (!(ckID && ckSize)) {
			throw "Invalid arguments.";
		}
		if (ckID.length != 4) {
			throw "RIFF chunk ID must be exactly 4 bytes long"
		}
		
		if (buffer && typeof(offset) === "number") {
			this.dataView = new DataView(buffer, offset, ckSize + 8);
		}
		else {
			this.dataView = new DataView(new ArrayBuffer(ckSize + 8));
		}
	
		this.ckID = ckID;
		this.dataView.setInt32(4, ckSize, true);
	};
	chunk.prototype = {
		get ckID() {
			// Thanks to no DataView.getChar()
			var str = "";
			str += String.fromCharCode(this.dataView.getUint8(0));
			str += String.fromCharCode(this.dataView.getUint8(1));
			str += String.fromCharCode(this.dataView.getUint8(2));
			str += String.fromCharCode(this.dataView.getUint8(3));
			return str;
		},
		set ckID(value) {
			if (value.length != 4) throw "Invalid argument.";
			this.dataView.setUint8(0, (value).charCodeAt(0));
			this.dataView.setUint8(1, (value).charCodeAt(1));
			this.dataView.setUint8(2, (value).charCodeAt(2));
			this.dataView.setUint8(3, (value).charCodeAt(3));
		},
		get ckSize() {
			return this.dataView.byteLength - 8;
		},
		get ckData() {
			return new DataView(this.dataView.buffer, this.dataView.byteOffset + 8, this.ckSize);
		}
	};
	return {
		Chunk: chunk
	}
});
