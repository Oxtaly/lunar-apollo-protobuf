//@source https://github.com/pawitp/protobuf-decoder/blob/master/src/protobufDecoder.js
// My godsend

// * MIT License

// * Copyright (c) 2019 Pawit Pornkitprasan

// * Permission is hereby granted, free of charge, to any person obtaining a copy
// * of this software and associated documentation files (the "Software"), to deal
// * in the Software without restriction, including without limitation the rights
// * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// * copies of the Software, and to permit persons to whom the Software is
// * furnished to do so, subject to the following conditions:

// * The above copyright notice and this permission notice shall be included in all
// * copies or substantial portions of the Software.

// * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// * SOFTWARE.

function decodeVarint(buffer: Buffer, offset: number) {
  // console.log(buffer, offset);
  let res = 0n;
  let shift = 0;
  let byte = 0;

  do {
    if (offset >= buffer.length) {
      throw new RangeError("Index out of bound decoding varint");
    }

    byte = buffer[offset++];

    const multiplier = 2n**BigInt(shift);
    const thisByteValue = BigInt(byte & 0x7f) * multiplier;
    shift += 7;
    res = res + thisByteValue;
  } while (byte >= 0x80);

  return {
    value: res,
    length: shift / 7
  };
}

class BufferReader {
  buffer: Buffer;
  offset: number;
  savedOffset: number;
  
  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  readVarInt() {
    const result = decodeVarint(this.buffer, this.offset);
    this.offset += result.length;

    return result.value;
  }

  readBuffer(length: number) {
    this.checkByte(length);
    const result = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;

    return result;
  }

  // gRPC has some additional header - remove it
  trySkipGrpcHeader() {
    const backupOffset = this.offset;

    if (this.buffer[this.offset] === 0 && this.leftBytes() >= 5) {
      this.offset++;
      const length = this.buffer.readInt32BE(this.offset);
      this.offset += 4;

      if (length > this.leftBytes()) {
        // Something is wrong, revert
        this.offset = backupOffset;
      }
    }
  }

  leftBytes() {
    return this.buffer.length - this.offset;
  }

  checkByte(length: number) {
    const bytesAvailable = this.leftBytes();
    if (length > bytesAvailable) {
      throw new Error(
        "Not enough bytes left. Requested: " +
          length +
          " left: " +
          bytesAvailable
      );
    }
  }

  checkpoint() {
    this.savedOffset = this.offset;
  }

  resetToCheckpoint() {
    this.offset = this.savedOffset;
  }
}

export enum TYPES {
  MSG_LEN_DELIMITER = -1,
  VARINT = 0,
  FIXED64 = 1,
  LEN_DELIM = 2,
  FIXED32 = 5
};

// export const TYPES = {
//   MSG_LEN_DELIMITER: -1,
//   VARINT: 0,
//   FIXED64: 1,
//   LENDELIM: 2,
//   FIXED32: 5
// };

// TODO: Fix var ints (imprecise past javascript int limit)

export function decodeProto(buffer: Buffer, parseDelimited?: number) {
  const reader = new BufferReader(buffer);
  const parts = [];

  reader.trySkipGrpcHeader();

  var protoBufMsgLength = 0;
  var protoBufMsgEnd = 0;

  try {
    while (reader.leftBytes() > 0) {
      reader.checkpoint();

      if (parseDelimited && protoBufMsgEnd === reader.offset) {
        const byteRange = [reader.offset];
        protoBufMsgLength = parseInt(reader.readVarInt().toString());
        protoBufMsgEnd = reader.offset + protoBufMsgLength;
        byteRange.push(reader.offset);
        parts.push({
          byteRange,
          index: -1,
          type: TYPES.MSG_LEN_DELIMITER,
          value: protoBufMsgLength
        });
      }

      const byteRange = [reader.offset];
      const indexType = parseInt(reader.readVarInt().toString());
      const type = indexType & 0b111;
      const index = indexType >> 3;

      let value;
      if (type === TYPES.VARINT) {
        value = reader.readVarInt().toString();
      } else if (type === TYPES.LEN_DELIM) {
        const length = parseInt(reader.readVarInt().toString());
        value = reader.readBuffer(length);
      } else if (type === TYPES.FIXED32) {
        value = reader.readBuffer(4);
      } else if (type === TYPES.FIXED64) {
        value = reader.readBuffer(8);
      } else {
        throw new Error("Unknown type: " + type);
      }
      byteRange.push(reader.offset);

      parts.push({
        byteRange,
        index,
        type,
        value
      });
    }
  } catch (err) {
    console.log(err);
    reader.resetToCheckpoint();
  }

  return {
    parts,
    leftOver: reader.readBuffer(reader.leftBytes())
  };
}

export function typeToString(type: TYPES, subType?: any) {
  switch (type) {
    case TYPES.VARINT:
      return "varint";
    case TYPES.LEN_DELIM:
      return subType || "len_delim";
    case TYPES.FIXED32:
      return "fixed32";
    case TYPES.FIXED64:
      return "fixed64";
    case TYPES.MSG_LEN_DELIMITER:
      return "Message delimiter";
    default:
      return "unknown";
  }
}