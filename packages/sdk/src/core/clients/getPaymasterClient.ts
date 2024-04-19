import { ENTRYPOINT_ADDRESS_V06 } from "@/constants";
import { type PimlicoPaymasterClient } from "permissionless/clients/pimlico";
import {
    type Account,
    type Address,
    type Chain,
    type Client,
    createClient,
    type Hex,
    http,
    type PublicClientConfig,
    toHex,
    type Transport,
} from "viem";
import type { EntryPoint } from "permissionless/types/entrypoint";
import type { Prettify } from "permissionless/types";
import { defaultAbiCoder, hexConcat } from "ethers/lib/utils";

export const getPaymasterClient = (
    transport: any
): PimlicoPaymasterClient<any> => {
    console.log(transport);

    return createPimlicoPaymasterClient({
        transport: http(
            // "https://api.pimlico.io/v1/80001/rpc?apikey=690deb0b-19a1-4bab-8684-30b7667da883",
            "http://localhost:3001/verifying-paymaster/validate",
            {
                fetchOptions: {
                    headers: {
                        apiKey: process.env.NEXT_PUBLIC_COMETH_API_KEY || "",
                        "x-consumer-access": "public",
                        "x-consumer-groups": "connect",
                        "x-consumer-username":
                            "a1c5eeaa6e874d74bc6c80a08cde44dc",
                        "x-project-chain-id": "137",
                    },
                },
            }
        ),
        entryPoint: ENTRYPOINT_ADDRESS_V06,
    });
};

const createPimlicoPaymasterClient = <
    entryPoint extends EntryPoint,
    transport extends Transport = Transport,
    chain extends Chain | undefined = undefined
>(
    parameters: PublicClientConfig<transport, chain> & {
        entryPoint: entryPoint;
    }
): any => {
    const { key = "public", name = "Pimlico Paymaster Client" } = parameters;
    const client = createClient({
        ...parameters,
        key,
        name,
        type: "pimlicoPaymasterClient",
    });
    return client.extend(paymasterActions(parameters.entryPoint));
};

const paymasterActions =
    <entryPoint extends EntryPoint>(entryPointAddress: entryPoint) =>
    (client: Client): any => ({
        sponsorUserOperation: async (args: Omit<any, "entryPoint">) =>
            sponsorUserOperation(client as PimlicoPaymasterClient<entryPoint>, {
                ...args,
                entryPoint: entryPointAddress,
            }),
    });

const sponsorUserOperation = async <
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined,
    TAccount extends Account | undefined = Account | undefined
>(
    client: Client<TTransport, TChain, TAccount, any>,
    args: Prettify<any>
) => {
    console.log("args", args);

    const response = await client.request({
        method: "pm_sponsorUserOperation",
        params: [deepHexlify(args.userOperation), args.entryPoint],
    });

    console.log("response", response);

    if (args.entryPoint === ENTRYPOINT_ADDRESS_V06) {
        const responseV06 = response as {
            paymasterAndData: Hex;
            preVerificationGas: Hex;
            verificationGasLimit: Hex;
            callGasLimit: Hex;
            paymaster?: never;
            paymasterVerificationGasLimit?: never;
            paymasterPostOpGasLimit?: never;
            paymasterData?: never;
        };
        return {
            paymasterAndData: responseV06.paymasterAndData,
            preVerificationGas: BigInt(responseV06.preVerificationGas),
            verificationGasLimit: BigInt(responseV06.verificationGasLimit),
            callGasLimit: BigInt(responseV06.callGasLimit),
        };
    }

    const responseV07 = response as {
        preVerificationGas: Hex;
        verificationGasLimit: Hex;
        callGasLimit: Hex;
        paymaster: Address;
        paymasterVerificationGasLimit: Hex;
        paymasterPostOpGasLimit: Hex;
        paymasterData: Hex;
        paymasterAndData?: never;
    };

    return {
        callGasLimit: BigInt(responseV07.callGasLimit),
        verificationGasLimit: BigInt(responseV07.verificationGasLimit),
        preVerificationGas: BigInt(responseV07.preVerificationGas),
        paymaster: responseV07.paymaster,
        paymasterVerificationGasLimit: BigInt(
            responseV07.paymasterVerificationGasLimit
        ),
        paymasterPostOpGasLimit: BigInt(responseV07.paymasterPostOpGasLimit),
        paymasterData: responseV07.paymasterData,
    };
};

export function deepHexlify(obj: any): any {
    if (typeof obj === "function") {
        return undefined;
    }
    if (obj == null || typeof obj === "string" || typeof obj === "boolean") {
        return obj;
    }

    if (typeof obj === "bigint") {
        return toHex(obj);
    }

    if (obj._isBigNumber != null || typeof obj !== "object") {
        return toHex(obj).replace(/^0x0/, "0x");
    }
    if (Array.isArray(obj)) {
        return obj.map((member) => deepHexlify(member));
    }
    return Object.keys(obj).reduce(
        // biome-ignore lint/suspicious/noExplicitAny: it's a recursive function, so it's hard to type
        (set: any, key: string) => {
            set[key] = deepHexlify(obj[key]);
            return set;
        },
        {}
    );
}
