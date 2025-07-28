import {
    type GrantPermissionMutateResponse,
    useAccount,
    useSendPermission,
} from "@cometh/connect-react-hooks";
import { type Hex, encodeFunctionData } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useReadContract } from "wagmi";
import countContractAbi from "../contract/counterABI.json";
import { Icons } from "../lib/ui/components";
import Alert from "../lib/ui/components/Alert";
import { Button } from "../lib/ui/components/Button";
import { COUNTER_CONTRACT_ADDRESS } from "./session-key-permission";

export default function SessionKeyTransaction({
    permission,
    privateKey,
}: {
    permission: GrantPermissionMutateResponse;
    privateKey: Hex;
}) {
    const { address } = useAccount();

    const { sendPermissionAsync, data, isPending, error, isSuccess } =
        useSendPermission({
            sessionData: permission.createSessionsResponse,
            privateKey,
        });
    const { data: counters } = useReadContract({
        abi: countContractAbi,
        functionName: "counters",
        args: [address],
        address: COUNTER_CONTRACT_ADDRESS,
        chainId: arbitrumSepolia.id,
        query: {
            refetchInterval: 2000,
        },
    });

    return (
        <div className="px-6 flex flex-col gap-4">
            <Button
                disabled={!permission}
                onClick={async () => {
                    const calldata = encodeFunctionData({
                        abi: countContractAbi,
                        functionName: "count",
                    });

                    await sendPermissionAsync({
                        actions: [
                            {
                                target: COUNTER_CONTRACT_ADDRESS,
                                callData: calldata,
                                value: BigInt(0),
                            },
                        ],
                    });
                }}
                variant="secondary"
                className="w-full"
            >
                {isPending ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                ) : (
                    "Count"
                )}
            </Button>
            <p className="text-center">
                Count: {((counters as bigint) || 0n).toString()}
            </p>
            {isSuccess && data && (
                <Alert
                    state="success"
                    content="Transaction confirmed !"
                    link={{
                        content: "Go see your transaction",
                        url: `${arbitrumSepolia.blockExplorers.default.url}/tx/${data}`,
                    }}
                />
            )}
            {!!error && <Alert state="error" content="Transaction Failed !" />}
        </div>
    );
}
