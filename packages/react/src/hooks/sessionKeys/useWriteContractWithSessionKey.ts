import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useMutation } from "@tanstack/react-query";
import type {
    Account,
    Chain,
    ContractFunctionArgs,
    ContractFunctionName,
    ContractFunctionParameters,
    DeriveChain,
    FormattedTransactionRequest,
    GetChainParameter,
    GetValue,
    Hash,
    Hex,
    UnionOmit,
} from "viem";
import { type Abi, encodeFunctionData } from "viem";
import type { GetAccountParameter } from "viem/_types/types/account";
import type { Prettify } from "viem/chains";
import type { UnionEvaluate } from "viem/types/utils";
import type {
    MutationOptionsWithoutMutationFn,
    QueryResultType,
} from "./../types";

/**
 * @description A custom hook for writing to smart contracts through a smart account using a session key.
 *
 * This hook provides functionality to write to a smart contract by encoding the function call
 * and sending it as a transaction using a session key. It uses the smart account client to process and send these transactions.
 *
 * @param mutationProps Optional mutation properties from @tanstack/react-query
 *
 * @example
 * ```tsx
 * import { useWriteContractWithSessionKey } from "@/hooks/useWriteContractWithSessionKey";
 * import { useState } from "react";
 * import { parseEther, Address } from "viem";
 * import { abi } from './contractABI';
 *
 * export const SessionKeyContractWriter = () => {
 *   const { writeContractWithSessionKey, isLoading, isError, error, isSuccess, data } = useWriteContractWithSessionKey();
 *   const [recipient, setRecipient] = useState<Address>();
 *   const [amount, setAmount] = useState<string>("0");
 *
 *   const handleWriteContract = async () => {
 *     if (recipient) {
 *       try {
 *         const hash = await writeContractWithSessionKey({
 *           abi,
 *           address: '0xYourContractAddress',
 *           functionName: 'transfer',
 *           args: [recipient, parseEther(amount)],
 *         });
 *         console.log("Contract write successful with session key! Hash:", hash);
 *       } catch (error) {
 *         console.error("Error writing to contract with session key:", error);
 *       }
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         placeholder="Recipient address"
 *         onChange={(e) => setRecipient(e.target.value as Address)}
 *       />
 *       <input
 *         type="number"
 *         placeholder="Amount in ETH"
 *         onChange={(e) => setAmount(e.target.value)}
 *       />
 *       <button onClick={handleWriteContract} disabled={isLoading}>
 *         Write to Contract with Session Key
 *       </button>
 *       {isError && <p>Error: {error.message}</p>}
 *       {isSuccess && <p>Contract write successful! Hash: {data}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - All properties from the mutation object (`isLoading`, `isError`, `error`, `isSuccess`, `data`, etc.)
 * - `writeContract`: A function to trigger the contract write with session key, which returns a promise
 *   that resolves to the transaction hash.
 */

/**
 * Type for the writeContractWithSessionKey function.
 * This function doesn't return a promise, suitable for fire-and-forget usage.
 */
export type WriteContractWithSessionKeyMutate = (
    variables: WriteContractWithSessionKeyParameters
) => void;

/**
 * Type for the writeContractWithSessionKeyAsync function.
 * This function returns a promise that resolves to the transaction hash.
 */
export type WriteContractWithSessionKeyMutateAsync = (
    variables: WriteContractWithSessionKeyParameters
) => Promise<Hash>;

// Return type of the hook
export type UseWriteContractWithSessionKeyReturn = QueryResultType & {
    writeContractWithSessionKey: WriteContractWithSessionKeyMutate;
    writeContractWithSessionKeyAsync: WriteContractWithSessionKeyMutateAsync;
};

export type WriteContractWithSessionKeyParameters<
    abi extends Abi | readonly unknown[] = Abi,
    functionName extends ContractFunctionName<
        abi,
        "nonpayable" | "payable"
    > = ContractFunctionName<abi, "nonpayable" | "payable">,
    args extends ContractFunctionArgs<
        abi,
        "nonpayable" | "payable",
        functionName
    > = ContractFunctionArgs<abi, "nonpayable" | "payable", functionName>,
    chain extends Chain | undefined = Chain | undefined,
    account extends Account | undefined = Account | undefined,
    chainOverride extends Chain | undefined = Chain | undefined,
    derivedChain extends Chain | undefined = DeriveChain<chain, chainOverride>,
> = ContractFunctionParameters<
    abi,
    "nonpayable" | "payable",
    functionName,
    args
> &
    GetChainParameter<chain, chainOverride> &
    Prettify<
        GetAccountParameter<account> &
            GetValue<
                abi,
                functionName,
                FormattedTransactionRequest<derivedChain>["value"]
            > & {
                /** Data to append to the end of the calldata. Useful for adding a ["domain" tag](https://opensea.notion.site/opensea/Seaport-Order-Attributions-ec2d69bf455041a5baa490941aad307f). */
                dataSuffix?: Hex;
            }
    > &
    UnionEvaluate<
        UnionOmit<
            FormattedTransactionRequest<derivedChain>,
            "data" | "from" | "to" | "value"
        >
    >;

export const useWriteContractWithSessionKey = (
    mutationProps?: MutationOptionsWithoutMutationFn
): UseWriteContractWithSessionKeyReturn => {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async (
                variables: WriteContractWithSessionKeyParameters
            ): Promise<Hash> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }

                const { abi, address, functionName, args, value } = variables;

                const data = encodeFunctionData({
                    abi,
                    functionName,
                    args,
                });

                const hash =
                    await smartAccountClient.sendTransactionWithSessionKey({
                        to: address,
                        data,
                        value,
                    });

                return hash;
            },
            ...mutationProps,
        },
        queryClient
    );

    return {
        data: result.data,
        error: result.error,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        writeContractWithSessionKey: mutate,
        writeContractWithSessionKeyAsync: mutateAsync,
    };
};
