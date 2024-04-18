import { createSmartAccountClient as createPermissionlessSmartAccountClient } from "permissionless";
import { getPaymasterClient } from "./getPaymasterClient";
// import { pimlicoPaymasterActions } from "permissionless/actions/pimlico";
// import { ENTRYPOINT_ADDRESS_V06 } from "@/constants";
// import { polygon } from "viem/chains";
// import { createClient, http } from "viem";

export const createSmartAccountClient: typeof createPermissionlessSmartAccountClient =
    (parameters) => {
        const paymasterClient = getPaymasterClient(parameters.bundlerTransport);
        // const paymasterClient = createClient({
        //     transport: http(
        //         "https://api.pimlico.io/v2/137/rpc?apikey=22fca35d-bdc6-4d4f-b7dc-75c056fe7f13"
        //     ),
        //     chain: polygon,
        // }).extend(pimlicoPaymasterActions(ENTRYPOINT_ADDRESS_V06));

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
