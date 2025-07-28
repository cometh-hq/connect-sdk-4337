import { useSessionKey } from "@/hooks/useSessionKey";
import { useGrantPermission } from "@cometh/connect-react-hooks";
import { useEffect } from "react";
import { type Hex, toFunctionSelector } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { Button, Icons } from "../lib/ui/components";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";

export default function SessionKeyPermission() {
    const { permission, setPermission, privateKey } = useSessionKey();
    const { grantPermission, isPending, data } = useGrantPermission();
    const sessionOwner = privateKeyToAccount(privateKey);

    useEffect(() => {
        if (data && !permission) {
            setPermission(data);
        }
    }, [data]);

    return (
        <div className="px-6">
            <Button
                onClick={() => {
                    grantPermission({
                        sessionRequestedInfo: [
                            {
                                sessionPublicKey: sessionOwner.address,
                                actionPoliciesInfo: [
                                    {
                                        contractAddress:
                                            COUNTER_CONTRACT_ADDRESS,
                                        functionSelector: toFunctionSelector(
                                            "function count()"
                                        ) as Hex,
                                    },
                                ],
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
                    "Init session keys"
                )}
            </Button>
        </div>
    );
}
