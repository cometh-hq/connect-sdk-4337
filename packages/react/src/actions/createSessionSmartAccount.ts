import type { ContextComethSmartAccountClient } from "@/providers";
import {
  createSafeSmartAccount,
  createSmartAccountClient,
  smartSessionActions,
  type SafeSigner,
} from "@cometh/connect-sdk-4337";
import { http } from "viem";

export const createSessionSmartAccountClient = async (
  apiKey: string,
  smartAccountClient: ContextComethSmartAccountClient,
  sessionKeySigner: SafeSigner<"safeSmartSessionsSigner">
) => {
  const sessionKeyAccount = await createSafeSmartAccount({
    apiKey,
    chain: smartAccountClient.chain,
    smartAccountAddress: smartAccountClient.account.address,
    smartSessionSigner: sessionKeySigner,
  });

  const paymasterClient = (smartAccountClient as any).paymaster;
  const bundlerUrl = (smartAccountClient.transport as any).url;

  return createSmartAccountClient({
    account: sessionKeyAccount,
    chain: smartAccountClient.chain,
    bundlerTransport: http(bundlerUrl),
    paymaster: paymasterClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return await paymasterClient.getUserOperationGasPrice();
      },
    },
  }).extend(smartSessionActions());
};

export type SmartSessionClient = ReturnType<
  typeof createSessionSmartAccountClient
>;
