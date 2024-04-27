import type { RpcSchema } from "viem";
import type { Prettify } from "viem/chains";

/**
 * Type that extract the possible parameters from a RPC Schema
 */
export type ExtractedParametersFromRpc<
    TRpcSchema extends RpcSchema | undefined = undefined,
> = TRpcSchema extends RpcSchema
    ? {
          [K in keyof TRpcSchema]: Prettify<
              {
                  method: TRpcSchema[K] extends TRpcSchema[number]
                      ? TRpcSchema[K]["Method"]
                      : string;
              } & (TRpcSchema[K] extends TRpcSchema[number]
                  ? TRpcSchema[K]["Parameters"] extends undefined
                        ? { params?: never }
                        : { params: TRpcSchema[K]["Parameters"] }
                  : never)
          >;
      }[number]
    : {
          method: string;
          params?: unknown;
      };

/**
 * Type that extract the possible return type from a RPC Schema
 */
export type ExtractedReturnTypeFromRpc<
    TRpcSchema extends RpcSchema | undefined = undefined,
    TParameters extends
        ExtractedParametersFromRpc<TRpcSchema> = ExtractedParametersFromRpc<TRpcSchema>,
> = TRpcSchema extends RpcSchema
    ? ExtractedMethodFromRpc<TRpcSchema, TParameters["method"]>["ReturnType"]
    : unknown;

/**
 * Type that extract the possible return type from a RPC Schema
 */
export type ExtractedMethodFromRpc<
    TRpcSchema extends RpcSchema | undefined = undefined,
    TMethod extends
        ExtractedParametersFromRpc<TRpcSchema>["method"] = ExtractedParametersFromRpc<TRpcSchema>["method"],
> = TRpcSchema extends RpcSchema
    ? Extract<TRpcSchema[number], { Method: TMethod }>
    : unknown;

/**
 * Type used for a one shot request function
 */
export type RequestFn<TRpcSchema extends RpcSchema | undefined = undefined> = <
    TParameters extends
        ExtractedParametersFromRpc<TRpcSchema> = ExtractedParametersFromRpc<TRpcSchema>,
    _ReturnType = ExtractedReturnTypeFromRpc<TRpcSchema, TParameters>,
>(
    args: TParameters
) => Promise<_ReturnType>;

/**
 * RPC interface that's used for the connect api communication
 */
export type ComethPaymasterRpcSchema = [
    {
        Method: "pm_sponsorUserOperation";
        Parameters: [userOperation: any, validUntil: any, validAfter: any];
        ReturnType: any;
    },
];
