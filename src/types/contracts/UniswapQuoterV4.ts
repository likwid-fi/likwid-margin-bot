/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedListener,
  TypedContractMethod,
} from "./common";

export type PathKeyStruct = {
  intermediateCurrency: AddressLike;
  fee: BigNumberish;
  tickSpacing: BigNumberish;
  hooks: AddressLike;
  hookData: BytesLike;
};

export type PathKeyStructOutput = [
  intermediateCurrency: string,
  fee: bigint,
  tickSpacing: bigint,
  hooks: string,
  hookData: string
] & {
  intermediateCurrency: string;
  fee: bigint;
  tickSpacing: bigint;
  hooks: string;
  hookData: string;
};

export type PoolKeyStruct = {
  currency0: AddressLike;
  currency1: AddressLike;
  fee: BigNumberish;
  tickSpacing: BigNumberish;
  hooks: AddressLike;
};

export type PoolKeyStructOutput = [
  currency0: string,
  currency1: string,
  fee: bigint,
  tickSpacing: bigint,
  hooks: string
] & {
  currency0: string;
  currency1: string;
  fee: bigint;
  tickSpacing: bigint;
  hooks: string;
};

export declare namespace IV4Quoter {
  export type QuoteExactParamsStruct = {
    exactCurrency: AddressLike;
    path: PathKeyStruct[];
    exactAmount: BigNumberish;
  };

  export type QuoteExactParamsStructOutput = [
    exactCurrency: string,
    path: PathKeyStructOutput[],
    exactAmount: bigint
  ] & {
    exactCurrency: string;
    path: PathKeyStructOutput[];
    exactAmount: bigint;
  };

  export type QuoteExactSingleParamsStruct = {
    poolKey: PoolKeyStruct;
    zeroForOne: boolean;
    exactAmount: BigNumberish;
    hookData: BytesLike;
  };

  export type QuoteExactSingleParamsStructOutput = [
    poolKey: PoolKeyStructOutput,
    zeroForOne: boolean,
    exactAmount: bigint,
    hookData: string
  ] & {
    poolKey: PoolKeyStructOutput;
    zeroForOne: boolean;
    exactAmount: bigint;
    hookData: string;
  };
}

export interface UniswapQuoterV4Interface extends Interface {
  getFunction(
    nameOrSignature:
      | "_quoteExactInput"
      | "_quoteExactInputSingle"
      | "_quoteExactOutput"
      | "_quoteExactOutputSingle"
      | "poolManager"
      | "quoteExactInput"
      | "quoteExactInputSingle"
      | "quoteExactOutput"
      | "quoteExactOutputSingle"
      | "unlockCallback"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "_quoteExactInput",
    values: [IV4Quoter.QuoteExactParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "_quoteExactInputSingle",
    values: [IV4Quoter.QuoteExactSingleParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "_quoteExactOutput",
    values: [IV4Quoter.QuoteExactParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "_quoteExactOutputSingle",
    values: [IV4Quoter.QuoteExactSingleParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "poolManager",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "quoteExactInput",
    values: [IV4Quoter.QuoteExactParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "quoteExactInputSingle",
    values: [IV4Quoter.QuoteExactSingleParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "quoteExactOutput",
    values: [IV4Quoter.QuoteExactParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "quoteExactOutputSingle",
    values: [IV4Quoter.QuoteExactSingleParamsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "unlockCallback",
    values: [BytesLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "_quoteExactInput",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_quoteExactInputSingle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_quoteExactOutput",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "_quoteExactOutputSingle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "poolManager",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "quoteExactInput",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "quoteExactInputSingle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "quoteExactOutput",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "quoteExactOutputSingle",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "unlockCallback",
    data: BytesLike
  ): Result;
}

export interface UniswapQuoterV4 extends BaseContract {
  connect(runner?: ContractRunner | null): UniswapQuoterV4;
  waitForDeployment(): Promise<this>;

  interface: UniswapQuoterV4Interface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  _quoteExactInput: TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [string],
    "nonpayable"
  >;

  _quoteExactInputSingle: TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [string],
    "nonpayable"
  >;

  _quoteExactOutput: TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [string],
    "nonpayable"
  >;

  _quoteExactOutputSingle: TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [string],
    "nonpayable"
  >;

  poolManager: TypedContractMethod<[], [string], "view">;

  quoteExactInput: TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [[bigint, bigint] & { amountOut: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;

  quoteExactInputSingle: TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [[bigint, bigint] & { amountOut: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;

  quoteExactOutput: TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [[bigint, bigint] & { amountIn: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;

  quoteExactOutputSingle: TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [[bigint, bigint] & { amountIn: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;

  unlockCallback: TypedContractMethod<
    [data: BytesLike],
    [string],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "_quoteExactInput"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [string],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "_quoteExactInputSingle"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [string],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "_quoteExactOutput"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [string],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "_quoteExactOutputSingle"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [string],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "poolManager"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "quoteExactInput"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [[bigint, bigint] & { amountOut: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "quoteExactInputSingle"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [[bigint, bigint] & { amountOut: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "quoteExactOutput"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactParamsStruct],
    [[bigint, bigint] & { amountIn: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "quoteExactOutputSingle"
  ): TypedContractMethod<
    [params: IV4Quoter.QuoteExactSingleParamsStruct],
    [[bigint, bigint] & { amountIn: bigint; gasEstimate: bigint }],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "unlockCallback"
  ): TypedContractMethod<[data: BytesLike], [string], "nonpayable">;

  filters: {};
}
