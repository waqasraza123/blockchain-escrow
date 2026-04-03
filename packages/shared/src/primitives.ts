export type EntityId = string;
export type IsoTimestamp = string;
export type ChainId = number;
export type WalletAddress = `0x${string}`;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonArray | JsonObject | JsonPrimitive;
export type JsonArray = JsonValue[];
export type JsonObject = {
  [key: string]: JsonValue;
};
