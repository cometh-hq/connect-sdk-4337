import { Icons } from "@/app/lib/ui/components";
import { CheckIcon } from "@radix-ui/react-icons";

interface ConnectWalletProps {
    connectionError: string | null;
    isConnecting: boolean;
    isConnected: boolean;
    connect: () => Promise<void>;
    smartAccount: any;
}

function ConnectWallet({
    connectionError,
    isConnecting,
    isConnected,
    connect,
    smartAccount,
}: ConnectWalletProps): JSX.Element {
    console.log("connectionError", connectionError);
    const getTextButton = () => {
        if (isConnected) {
            return (
                <>
                    <CheckIcon width={20} height={20} />
                    <a
                        href={`${process.env.NEXT_PUBLIC_SCAN_URL}address/${smartAccount.account.address}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        {"Wallet connected"}
                    </a>
                </>
            );
        } else if (isConnecting) {
            return (
                <>
                    <Icons.spinner className="h-6 w-6 animate-spin" />
                    {"Getting wallet..."}
                </>
            );
        } else {
            return "Get your Wallet";
        }
    };

    return (
        <>
            {!connectionError ? (
                <button
                    disabled={isConnecting || isConnected || !!connectionError}
                    className="flex items-center justify-center gap-x-2.5 p-3 font-semibold text-gray-900 hover:bg-gray-100 disabled:bg-white"
                    onClick={connect}
                >
                    {getTextButton()}
                </button>
            ) : (
                <p className="flex items-center justify-center text-gray-900 bg-red-50">
                    Connection denied
                </p>
            )}
        </>
    );
}

export default ConnectWallet;
