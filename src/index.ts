// lunar-apollo-protobuf-utils
// Copyright (C) 2025  Oxtaly

// // This program is free software: you can redistribute it and/or modify
// // it under the terms of the GNU General Public License as published by
// // the Free Software Foundation, either version 3 of the License, or
// // (at your option) any later version.

// // This program is distributed in the hope that it will be useful,
// // but WITHOUT ANY WARRANTY; without even the implied warranty of
// // MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// // GNU General Public License for more details.

// // You should have received a copy of the GNU General Public License
// // along with this program.  If not, see <https://www.gnu.org/licenses/>.

import fs from "node:fs";
import path from "node:path";
import { decodeProto } from "./protobuf-decoder/protobufDecoder";
import { Writer } from "protobufjs/minimal";
import { PROTO_BUNDLE_FILE_PATH as DEFAULT_PROTO_BUNDLE_FILE_PATH } from "./scripts/setup";
import type { LunarProtoMessage, LunarProtoMessagesNames as LunarProtoMessageName, LunarProtoExports, LunarProtoMessageByName, LunarProtoMessageClassByName, LunarProtoMessageClasses } from "../ProtoTypes.d.ts";
export type * from "../ProtoTypes.d.ts";

const PROTO_BUNDLE_FILE_PATH = process.env?.LUNAR_PROTO_BUNDLE_FILE_PATH ? path.resolve(process.env?.LUNAR_PROTO_BUNDLE_FILE_PATH) : DEFAULT_PROTO_BUNDLE_FILE_PATH;

if(!fs.existsSync(PROTO_BUNDLE_FILE_PATH))
    throw new Error(`PROTO_BUNDLE_FILE_PATH ('${PROTO_BUNDLE_FILE_PATH}') does not exist! Make sure 'setup' script was ran before using this or that environment variable LUNAR_PROTO_BUNDLE_FILE_PATH is set correctly!`);

///@ts-ignore // ! - To make compilation possible before the 'setup' scripts have been ran
import bundle from "../bin/proto.bundle";

import packageInfos from "../package.json";
const logStr = `package/${packageInfos?.name ? packageInfos.name + ' ' : __dirname}[${path.basename(__filename)}]`;

// ! using reflection is slower (~1.7x slower on 1100 packets testing, ~10.2ms for static and ~17.4ms for reflection)
// let lunarRoot: protobuf.Root;
// try {
//     lunarRoot = protobuf.loadSync(PROTO_BUNDLE_FILE_PATH.replace(/.js$/, '.json'));
// } catch (error) {
//     throw new Error(`An error happened loading proto bundle (${PROTO_BUNDLE_FILE_PATH})! Make sure 'setup' script was ran before using this or that environment variable LUNAR_PROTO_BUNDLE_FILE_PATH is set correctly! Original error as cause.`, { cause: error });
// }

/** Required to prevent semi-arbitrary .encode/.decode function calls from lookupType */
export const AvailableLunarMessageNames: LunarProtoMessageName[] = [];
// TODO: Add proper typing
export const AvailableLunarFullTypes: string[] = [];
const apollo = bundle.lunarclient.apollo;
Object.keys(apollo).forEach((moduleName) => {
    const obj = apollo[moduleName as keyof typeof apollo]?.v1;
    if(!obj)
        throw new Error(`Module bundle.lunarclient.apollo.${moduleName} does not have a v1 export!`);
    Object.keys(obj).forEach((key, i, arr) => {
        const fullType = `lunarclient.apollo.${moduleName}.v1.${key}`;
        if(key.endsWith('Message')) {
            if(AvailableLunarMessageNames.includes(key as LunarProtoMessageName)) {
                if(!process.env?.['SILENCE_lunar-apollo-protobuf-utils'])
                    console.warn(`${logStr} Message ${key} is duplicated, unexpected behavior may follow!`);
            }
            else
                AvailableLunarMessageNames.push(key as LunarProtoMessageName);
        }
        AvailableLunarFullTypes.push(fullType);
        const self = obj[key as keyof typeof obj];
        // * Guarantee the @type and @name properties (should be generated during the 'bundle-protos' setup script, this is in case a separate bundle file is provided)
        ///@ts-ignore
        obj[key as keyof typeof obj]['@type'] = fullType;
        ///@ts-ignore
        obj[key as keyof typeof obj]['@name'] = key;
        if('prototype' in self) {
            ///@ts-ignore
            obj[key as keyof typeof obj].prototype['@type'] = fullType;
            ///@ts-ignore
            obj[key as keyof typeof obj].prototype['@name'] = key;
        }
    });
});

export class InvalidLunarProtoError extends Error {};

export class LunarProtoUtils {
    private constructor() {
        throw new Error(`Class is not instantiable!`);
    }

    private static typeClassesCacheByName: Map<LunarProtoMessageName, LunarProtoMessageClasses> = new Map();
    private static typeClassesCacheByFullType: Map<string, LunarProtoMessageClasses> = new Map();
    static {
        /** Load all of them into the cache */
        AvailableLunarFullTypes.forEach((fullType) => {
            try { this.lookupType(fullType) } catch (_) { /** Some exports are enums and don't have constructors/encode/decode functions */ };
        });
    }
    
    // static lookupReflectionType(lunarFullType: string) {
    //     if(lunarFullType.startsWith('.'))
    //         lunarFullType = lunarFullType.slice(1);
    //     const cached = this.typeFunctionsCache.get(lunarFullType);
    //     if(cached)
    //         return cached;
        
    //     let err: Error;
    //     let typeFn: Type = bundle as any;
    //     try {
    //         typeFn = lunarRoot.lookupType(lunarFullType);
    //     } catch (error) {
    //         if(error === err)
    //             throw error;
    //         throw new Error(`Could not look up type '${lunarFullType}'! Original error as cause.error.`, { cause: { error, lunarType: lunarFullType } });
    //     }
    //     this.typeFunctionsCache.set(lunarFullType, typeFn);
    //     return typeFn;
    // }

    static lookupMessage<T extends LunarProtoMessageName>(messageName: T): LunarProtoMessageClassByName<T> {
        const cached = this.typeClassesCacheByName.get(messageName);
        if(cached)
            return cached as LunarProtoMessageClassByName<T>;
        throw new Error(`Message '${messageName}' not found in cache!`);
    }

    /**
     * Looks up a type 
     */
    static lookupType(lunarFullType: string) {
        if(lunarFullType.startsWith('.'))
            lunarFullType = lunarFullType.slice(1);
        const cached = this.typeClassesCacheByFullType.get(lunarFullType);
        if(cached)
            return cached;
        
        let err: Error;
        let typeClass: LunarProtoMessageClasses = bundle as any;
        const splitted = lunarFullType.split('.');
        try {
            // if(!AvailableLunarMessages.includes(splitted.at(-1) as LunarProtoMessagesNames))
            //     throw err = new Error(`UNKNOWN_TYPE: Type '[BUNDLE].${lunarType}' is not in AvailableMessages!`, { cause: { lunarType } });
            if(!AvailableLunarFullTypes.includes(lunarFullType))
                throw err = new Error(`UNKNOWN_TYPE: Type '[BUNDLE].${lunarFullType}' is not in AvailableLunarTypes!`, { cause: { lunarType: lunarFullType } });
            splitted.forEach((prop, i) => {
                // Object.getOwnPropertyNames(typeFn);
                if(!(prop in typeClass))
                    throw new Error(`key '${prop}' not found in '[BUNDLE].${splitted.slice(0, i).join('.')}'!`);
                //@ts-ignore
                typeClass = typeClass[prop]
            });
            if(!('encode' in typeClass) || typeof typeClass.encode !== 'function')
                throw err = new Error(`INVALID_TYPE: Type '[BUNDLE].${lunarFullType}' does not have function 'encode'!`, { cause: { lunarType: lunarFullType } });
            if(!('decode' in typeClass) || typeof typeClass.decode !== 'function')
                throw err = new Error(`INVALID_TYPE: Type '[BUNDLE].${lunarFullType}' does not have function 'decode'!`, { cause: { lunarType: lunarFullType } });
        } catch (error) {
            if(error === err)
                throw error;
            throw new Error(`Could not look up type '${lunarFullType}'! Original error as cause.error.`, { cause: { error, lunarType: lunarFullType } });
        }
        const messageName = splitted.at(-1) as LunarProtoMessageName;
        // * If more than one message exists with the same name (should not be the case either way), always keep the first one loaded in cache (consistently inconsistent)
        if(messageName.endsWith('Message') && !this.typeClassesCacheByName.has(messageName))
            this.typeClassesCacheByName.set(messageName, typeClass);
        this.typeClassesCacheByFullType.set(lunarFullType, typeClass);
        return typeClass;
    }

    /**
     * Encodes a complete buffer into a {@link LunarProtoMessage} from a complete buffer as received from the 'lunar:apollo' plugin channel 
     */
    static decodeMessage(buffer: Buffer): LunarProtoMessage {
        let err: Error;
        try {
            const [header, message] = decodeProto(buffer)?.parts;
            if(!header)
                throw err = new InvalidLunarProtoError(`buffer did not contain any protobuf messages!`, { cause: { buffer, header, message } });
            if(message && !(message.value instanceof Buffer))
                throw err = new InvalidLunarProtoError(`message value was not a buffer!`, { cause: { buffer, header, message } });
            const lunarType = header.value.toString().split('/').at(-1);
            const type = LunarProtoUtils.lookupType(lunarType);
            const decoded = type.decode(message?.value instanceof Buffer ? message.value : Buffer.alloc(0));
            // * Forced conversion, @name property was already added to prototypes and classes during loading  
            return decoded as unknown as LunarProtoMessage;
        } catch (error) {
            if(error === err)
                throw error;
            throw new InvalidLunarProtoError(`An error happened decoding buffer! Original error as cause.error.`, { cause: { error, buffer } });
        }
    }
    
    /**
     * Encodes a message created by {@link LunarProtoUtils.create} or it's aliases into a complete buffer ready to be sent  
     */
    static encodeMessage<T extends LunarProtoMessage>(message: T): Buffer {
        const messageClass = this.lookupType(message["@type"]);
        let writer = Writer.create();
        // https://github.com/protobufjs/protobuf.js/blob/master/examples/reader-writer.js#L9
        /** id 1, wireType 2 | Write the first object/LEN_DELIM header bytes followed by the full message type (including the type.googleapis.com/ at the beginning) */
        writer.uint32((1 << 3 | 2) >>> 0).string(messageClass.getTypeUrl());
        let packetWriter = messageClass.encode(message as any);
        if(!packetWriter.len)
            return writer.finish() as Buffer;
        /** id 2, wireType 2; | Message body was not empty, writing the second object/LEN_DELIM followed by it's length */
        writer.uint32((2 << 3 | 2) >>> 0);
        writer.uint32(packetWriter.len);
        /** Link the packetWriter and the writer together to produce one continuous buffer */
        ///@ts-ignore
        writer.tail.next = packetWriter.head;
        writer.len += packetWriter.len;
        const buffer = writer.finish();
        /** Objects are linked together, not sure if that counts as them having a reference to each other, but to help out garbage collection: */
        writer.tail = null;
        writer.head = null;
        writer.states = null;
        writer = null;
        packetWriter.head = null;
        packetWriter.tail = null;
        packetWriter.states = null;
        packetWriter = null;
        return buffer as Buffer;
    }

    /**
     * Alias for LunarProtoUtils.lookupMessage(messageName).create()
     */
    static create<T extends LunarProtoMessageName>(messageName: T, ...args: Parameters<LunarProtoMessageClassByName<T>['create']>): ReturnType<LunarProtoMessageClassByName<T>['create']> {
        const messageClass = this.lookupMessage(messageName) as LunarProtoMessageClassByName<T>;
        ///@ts-expect-error - This is valid, not sure how to fix this;
        return messageClass.create(...args);
    }

    /**
     * Alias for LunarProtoUtils.lookupMessage(messageName).decode()
     * - Decodes a message of \@name {messageName} that does not have it's type header in the supplied buffer. 
     */
    static decodeFrom<T extends LunarProtoMessageName>(messageName: T, ...args: Parameters<LunarProtoMessageClassByName<T>['decode']>): ReturnType<LunarProtoMessageClassByName<T>['decode']> {
        const messageClass = this.lookupMessage(messageName) as LunarProtoMessageClassByName<T>;
        ///@ts-expect-error - This is valid, not sure how to fix this;
        return messageClass.decode(...args);
    }
    
    /**
     * Alias for LunarProtoUtils.lookupMessage(messageName).verify()
     */
    static verify<T extends LunarProtoMessageName>(messageName: T, ...args: Parameters<LunarProtoMessageClassByName<T>['verify']>): ReturnType<LunarProtoMessageClassByName<T>['verify']> {
        const messageClass = this.lookupMessage(messageName) as LunarProtoMessageClassByName<T>;
        ///@ts-expect-error - This is valid, not sure how to fix this;
        return messageClass.verify(...args);
    }
}