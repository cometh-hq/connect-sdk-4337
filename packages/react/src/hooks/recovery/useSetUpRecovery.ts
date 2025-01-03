import { useSmartAccount } from "@/hooks/useSmartAccount";
import type { SetUpRecoveryModuleParams } from "@cometh/connect-sdk-4337";
import { useMutation } from "@tanstack/react-query";
import type { Hex } from "viem";
import type { QueryResultType } from "../types";

export type UseSetUpRecoveryModuleProps = SetUpRecoveryModuleParams;

export type SetUpRecoveryModuleMutate = (
    variables: UseSetUpRecoveryModuleProps
) => void;

export type SetUpRecoveryModuleMutateAsync = (
    variables: UseSetUpRecoveryModuleProps
) => Promise<Hex>;

export type UseSetUpRecoveryModuleReturn = QueryResultType & {
    setUpRecoveryModule: SetUpRecoveryModuleMutate;
    setUpRecoveryModuleAsync: SetUpRecoveryModuleMutateAsync;
};

/**
 * A custom hook for setting up a recovery module for a smart account.
 *
 * This hook provides functionality to set up a recovery module, which includes
 * deploying a delay module and enabling necessary modules for the smart account.
 * It uses the smart account client to process and send the required transactions.
 *
 * @template entryPoint - The type of EntryPoint used in the smart account setup.
 *
 * @example
 * ```tsx
 * import { useSetUpRecoveryModule } from "@/hooks/useSetUpRecoveryModule";
 *
 * export const RecoverySetup = () => {
 *   const {
 *     setUpRecoveryModule,
 *     setUpRecoveryModuleAsync,
 *     isLoading,
 *     isError,
 *     error,
 *     isSuccess,
 *     data
 *   } = useSetUpRecoveryModule();
 *
 *   const handleSetUp = async () => {
 *     try {
 *       const result = await setUpRecoveryModuleAsync({
 *         passKeyName: 'myPassKey',
 *         publicClient,
 *         // other necessary parameters
 *       });
 *       console.log('Recovery module set up successfully:', result);
 *     } catch (error) {
 *       console.error('Error setting up recovery module:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSetUp} disabled={isLoading}>
 *         Set Up Recovery Module
 *       </button>
 *       {isLoading && <p>Setting up recovery module...</p>}
 *       {isError && <p>Error: {error?.message}</p>}
 *       {isSuccess && <p>Recovery module set up successfully. Hash: {data}</p>}
 *     </div>
 *   );
 * };
 * ```
 *
 * @returns An object containing:
 * - `setUpRecoveryModule`: A function to trigger the recovery module setup without waiting for the result.
 * - `setUpRecoveryModuleAsync`: A function to trigger the recovery module setup and wait for the result.
 * - `isLoading`: A boolean indicating if the setup is in progress.
 * - `isError`: A boolean indicating if an error occurred during setup.
 * - `error`: The error object if an error occurred, null otherwise.
 * - `isSuccess`: A boolean indicating if the setup was successful.
 * - `data`: The transaction hash (Hex) returned after successful setup.
 */
export function useSetUpRecovery(): UseSetUpRecoveryModuleReturn {
    const { smartAccountClient, queryClient } = useSmartAccount();

    const { mutate, mutateAsync, ...result } = useMutation(
        {
            mutationFn: async (
                variables: UseSetUpRecoveryModuleProps
            ): Promise<Hex> => {
                if (!smartAccountClient) {
                    throw new Error("No smart account found");
                }

                return smartAccountClient.setUpRecoveryModule({
                    passKeyName: variables.passKeyName,
                    publicClient: variables.publicClient,
                    webAuthnOptions: variables.webAuthnOptions,
                });
            },
        },
        queryClient
    );

    return {
        setUpRecoveryModule: mutate,
        setUpRecoveryModuleAsync: mutateAsync,
        isPending: result.isPending,
        isError: result.isError,
        error: result.error,
        isSuccess: result.isSuccess,
        data: result.data,
    };
}
