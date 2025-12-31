///@ts-nocheck - // ! - To make compilation possible before the 'setup' scripts have been run
import type { Reader, Writer } from "protobufjs";
import type { lunarclient } from "./bin/proto.bundle";
export type { lunarclient };

type ValuesOf<T> = T[keyof T];

/** @source https://stackoverflow.com/a/50375286 */
type UnionToIntersection<T> = (T extends any ? (x: T) => void : never) extends ((x: infer I) => void) ? I : never

// TODO: Add proper @type exact string values type
type ObjWithName<Name> = {
    /** Static last part of the type (.lookupType().getTypeUrl().split('.').at(-1)) */ 
    '@name': Name, 
    /** Static Lunar type, similar to .lookupType().getTypeUrl().split('/').at(-1) */ 
    '@type': string
};

type ProtobufTypeClassRequiredProps = { 
    encode(...args): any, 
    decode(...args): any, 
    create(...args): any, 
    verify(...args): any
};

// TODO: Find a way to reintroduce function comments from the original if possible
type ProtobufFunctionsWithName<Self, Name> = {
    create(...args: Parameters<Self['create']>): AddNameToSelfObj<ReturnType<Self['create']>, Name>
    decode(...args: Parameters<Self['decode']>): AddNameToSelfObj<ReturnType<Self['decode']>, Name>
    decodeDelimited(...args: Parameters<Self['decodeDelimited']>): AddNameToSelfObj<ReturnType<Self['decodeDelimited']>, Name>
}

type AddNameToSelfAndPrototype<Target, Name> = Omit<Target, 'create' | 'decode' | 'decodeDelimited'> & (new (...args: ConstructorParameters<Target>) => AddNameToSelf<InstanceType<Target>, Name>) & ObjWithName<Name> & { prototype: ObjWithName<Name> } & ProtobufFunctionsWithName<Target, Name>;
type AddNameToSelfObj<Target, Name> = Target extends Object ? Target & ObjWithName<Name> : Target;
type AddNameToSelf<Target, Name> = Target extends abstract new (...args: any) => any ? AddNameToSelfAndPrototype<Target, Name> : AddNameToSelfObj<Target, Name>;
type AddNameToAll<T extends Object> = { [key in keyof T]: AddNameToSelf<T[key], key> }; 

type OnlyMessageKey<K extends string> = K extends `${string}Message` ? K : never;
type OnlyNonProtobufTypeClassKey<T extends ProtobufTypeClassRequiredProps, K extends string> = T extends ProtobufTypeClassRequiredProps ? never : K;
type OnlyProtobufTypeClass<T extends Object> = { [key in keyof T as Exclude<key, OnlyNonProtobufTypeClassKey<T[key], key>>]: T[key] };

type UnnamedLunarProtoExports = UnionToIntersection<ValuesOf<typeof lunarclient['apollo']>['v1']>;

export type LunarProtoExports = AddNameToAll<UnnamedLunarProtoExports>;
/** 
 * Type for all protobufjs type classes exported by the lunarclient proto definitions.
 */
export type LunarProtoTypeClassExports = OnlyProtobufTypeClass<LunarProtoExports>;
/** 
 * Type for the name of any protobufjs class/type exported by the lunarclient proto definitions.
 */
export type LunarProtoTypeClassName = keyof LunarProtoTypeClassExports;
/** 
 * Type for any protobufjs class/type exported by the lunarclient proto definitions.
 */
export type LunarProtoTypeClass = ValuesOf<LunarProtoTypeClassExports>;

export type LunarProtoMessageName = OnlyMessageKey<keyof LunarProtoExports>;
export type LunarProtoMessageClass = LunarProtoExports[LunarProtoMessageName];
export type LunarProtoMessage = InstanceType<LunarProtoExports[LunarProtoMessageName]>;
export type LunarProtoMessageByName<T extends LunarProtoMessageName> = Extract<LunarProtoMessage, { '@name': T }>;
export type LunarProtoMessageClassByName<T extends LunarProtoMessageName> = Extract<LunarProtoMessageClass, { '@name': T }>;