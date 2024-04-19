import { createSmartAccountClient as createPermissionlessSmartAccountClient } from "permissionless";
// import { getPaymasterClient } from "./getPaymasterClient";
import { pimlicoPaymasterActions } from "permissionless/actions/pimlico";
import { ENTRYPOINT_ADDRESS_V06 } from "@/constants";
import { polygon } from "viem/chains";
import { createClient, http } from "viem";

export const createSmartAccountClient: typeof createPermissionlessSmartAccountClient =
    (parameters) => {
        // const paymasterClient = getPaymasterClient(parameters.bundlerTransport);
        const paymasterClient = createClient({
            transport: http(
                // "https://api.pimlico.io/v1/80001/rpc?apikey=690deb0b-19a1-4bab-8684-30b7667da883",
                "http://localhost:3001/verifying-paymaster/validate",
                {
                    fetchOptions: {
                        headers: {
                            apiKey:
                                process.env.NEXT_PUBLIC_COMETH_API_KEY || "",
                            "x-consumer-access": "public",
                            "x-consumer-groups": "connect",
                            "x-consumer-username":
                                "a1c5eeaa6e874d74bc6c80a08cde44dc",
                            "x-project-chain-id": "137",
                        },
                    },
                }
            ),
            chain: polygon,
        }).extend(pimlicoPaymasterActions(ENTRYPOINT_ADDRESS_V06));

        return createPermissionlessSmartAccountClient({
            middleware: {
                sponsorUserOperation:
                    paymasterClient.sponsorUserOperation as any,
            },
            account: parameters.account,
            bundlerTransport: parameters.bundlerTransport,
            chain: parameters.chain,
            entryPoint: parameters.entryPoint,
            name: parameters.name,
            key: parameters.key,
            pollingInterval: parameters.pollingInterval,
            cacheTime: parameters.cacheTime,
        });
    };
