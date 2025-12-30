///@ts-nocheck - // ! - To make compilation possible before the 'setup' scripts have been ran
import type { Reader, Writer } from "protobufjs";
import type { lunarclient } from "./bin/proto.bundle";
export type { lunarclient };

type ValuesOf<T> = T[keyof T];

/** @source https://stackoverflow.com/a/50375286 */
type UnionToIntersection<T> = (T extends any ? (x: T) => void : never) extends ((x: infer I) => void) ? I : never

// TODO: Add proper @type exact string values type
type ObjWithName<Name> = {
    /** Last part of the type */ 
    "@name": Name, 
    /** Static Lunar type, similar to .lookupType().getTypeUrl().split('/').at(-1) */ 
    "@type": string
};
type ObjWithConstructorName<T> = { 
    /** Last part of the type */ 
    "@name": T['@name']
    /** Static Lunar type, similar to .lookupType().getTypeUrl().split('/').at(-1) */ 
    "@type": T['@type']
}

type ProtobufFunctionsWithName<Self, Name> = {
    // TODO: Fix the create function not properly adding the [@name] props? even tho it does? Im not sure why it's not showing up in VSC for the create function but it is for the decode function.
    // TODO: Fix above a different way than by using Omit on the original since that delete the constructor so recreating it loses the comments
    create(...args: Parameters<Self['create']>): AddNameToSelfObj<ReturnType<Self['create']>, Name>
    decode(...args: Parameters<Self['decode']>): AddNameToSelfObj<ReturnType<Self['decode']>, Name>
    decodeDelimited(...args: Parameters<Self['decodeDelimited']>): AddNameToSelfObj<ReturnType<Self['decodeDelimited']>, Name>
}

type AddNameToSelfAndPrototype<Target, Name> = Omit<Target, "create"> & (new (...args: ConstructorParameters<Target>) => AddNameToSelf<InstanceType<Target>, Name>) & ObjWithName<Name> & { prototype: ObjWithName<Name> } & ProtobufFunctionsWithName<Target, Name>;
type AddNameToSelfObj<Target, Name> = Target extends Object ? Target & ObjWithName<Name> : Target;
type AddNameToSelf<Target, Name> = Target extends abstract new (...args: any) => any ? AddNameToSelfAndPrototype<Target, Name> : AddNameToSelfObj<Target, Name>;

type AddNameToAll<T extends Object> = { [key in keyof T]: AddNameToSelf<T[key], key> }; 

type ExtractMessageKeys<T extends string> = T extends `${string}Message` ? T : never;
export type LunarProtoExports = UnionToIntersection<ValuesOf<typeof lunarclient['apollo']>['v1']>
export type LunarProtoMessagesNames = ExtractMessageKeys<keyof LunarProtoExports>;
export type LunarProtoMessageClasses = AddNameToAll<LunarProtoExports>[LunarProtoMessagesNames];
export type LunarProtoMessage = InstanceType<AddNameToAll<LunarProtoExports>[LunarProtoMessagesNames]>;
export const LunarProtoMessages: LunarProtoMessage[];
export type LunarProtoMessageByName<T extends LunarProtoMessagesNames> = Extract<LunarProtoMessage, { "@name": T }>;
export type LunarProtoMessageClassByName<T extends LunarProtoMessagesNames> = Extract<LunarProtoMessageClasses, { "@name": T }>;