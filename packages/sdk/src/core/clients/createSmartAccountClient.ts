import { createSmartAccountClient as createPermissionlessSmartAccountClient } from "permissionless";
// import { getPaymasterClient } from "./getPaymasterClient";

export const createSmartAccountClient: typeof createPermissionlessSmartAccountClient =
    (parameters) => {
        // const paymasterClient = getPaymasterClient(parameters.bundlerTransport);

        return createPermissionlessSmartAccountClient({
            // middleware: {
            //     sponsorUserOperation:
            //         paymasterClient.sponsorUserOperation as any,
            // },
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
