# lunar-apollo-protobuf-utils

## Node.js based protobuf encoder/decoder using protobufjs

## Installation

```bash
git clone git+https://github.com/Oxtaly/lunar-apollo-protobuf-utils.git && cd ./lunar-apollo-protobuf-utils && npm i && npx tsc
```

## Usage:

### First, download and compile the .proto files from https://buf.build/lunarclient/apollo into a bundle using the "setup" script

```bash
npm run setup
```

### Then, you can just import it as you would in any project like so:
```js
const { LunarProtoUtils } = require('lunar-apollo-protobuf-utils');

/** 
 * @type {Buffer} Buffer containing a full lunarclient.apollo message
 * IE the data in a plugin packet with the channel `lunar:apollo`
 */
const buffer = null;

/** May throw if the buffer is not a valid message or is not structured correctly */
const decoded = LunarProtoUtils.decodeMessage(buffer);

if(decoded['@name'] === 'PlayerHandshakeMessage') {
    console.log(`Client is using lunar ${decoded?.lunarClientVersion?.semver}`);
    const message = LunarProtoUtils.create('OverrideServerRichPresenceMessage', {
        gameName: "Visual Studio Code",
        gameState: "Editing index.ts",
        gameVariantName: "Coding...",
        teamMaxSize: 1,
        teamCurrentSize: 1
    });
    message.mapName = "Package/lunar-apollo-protobuf-utils";
    /** Fake function accepting a buffer to send to the client using the `lunar:apollo` channel */
    sendLunarApolloMessageToClient(LunarProtoUtils.encodeMessage(message));
}
```
...or in typescript/ESM
```ts
import { LunarProtoUtils } from 'lunar-apollo-protobuf-utils'; 

/** 
 * Buffer containing a full lunarclient.apollo message
 * IE the data in a plugin packet with the channel `lunar:apollo`
 */
const buffer: Buffer = null;

/** May throw if the buffer is not a valid message or is not structured correctly */
const decoded = LunarProtoUtils.decodeMessage(buffer);

if(decoded['@name'] === 'PlayerHandshakeMessage') {
    console.log(`Client is using lunar ${decoded?.lunarClientVersion?.semver}`);
    const message = LunarProtoUtils.create('OverrideServerRichPresenceMessage', {
        gameName: "Visual Studio Code",
        gameState: "Editing index.ts",
        gameVariantName: "Coding...",
        teamMaxSize: 1,
        teamCurrentSize: 1
    });
    message.mapName = "Package/lunar-apollo-protobuf-utils";
    /** Fake function accepting a buffer to send to the client using the `lunar:apollo` channel */
    sendLunarApolloMessageToClient(LunarProtoUtils.encodeMessage(message));
};
```

## Additional thanks

This project makes use of the [protobuf decoder by pawtip](https://github.com/pawitp/protobuf-decoder/blob/master/src/protobufDecoder.js) to decode the protobuf message type from the initial message buffer;
It was also very useful during the debugging process thanks to their [very nice to use website](https://protobuf-decoder.netlify.app/)