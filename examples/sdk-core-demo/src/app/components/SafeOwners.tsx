"use client";

import type React from "react";
import { useState } from "react";
import { PlusIcon } from "@radix-ui/react-icons";
import type { Address } from "viem";

interface SafeOwnersProps {
    smartAccount: any;
}

function SafeOwners({ smartAccount }: SafeOwnersProps) {
    const [result, setResult] = useState<any>(null);
    const [newOwner, setNewOwner] = useState<Address>("" as Address);
    const [ownerToRemove, setOwnerToRemove] = useState<Address>("" as Address);

    const ownerActions = [
        {
            label: "smartAccount.getOwners()",
            action: async () => {
                return await smartAccount.getOwners();
            },
        },
        {
            label: "smartAccount.addOwner()",
            action: async () => {
                if (!newOwner) {
                    throw new Error("Please enter an address to add.");
                }
                return await smartAccount.addOwner({ ownerToAdd: newOwner });
            },
        },
        {
            label: "smartAccount.removeOwner()",
            action: async () => {
                if (!ownerToRemove) {
                    throw new Error("Please enter an address to remove.");
                }
                return await smartAccount.removeOwner({
                    ownerToRemove: ownerToRemove,
                });
            },
        },
    ];

    return (
        <main>
            <div className="p-4">
                <div className="relative flex flex-col items-center gap-y-6 rounded-lg p-4">
                    {ownerActions.map((actionItem, index) => (
                        <button
                            key={index}
                            className="flex h-11 py-2 px-4 gap-2 items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200"
                            onClick={async () => {
                                try {
                                    const result = await actionItem.action();
                                    console.log(
                                        `### ${index + 1}: ${actionItem.label}`,
                                        result
                                    );
                                    setResult(result);
                                } catch (error) {
                                    console.error(
                                        `Error in ${actionItem.label}:`,
                                        error
                                    );
                                    setResult({ error: error.message });
                                }
                            }}
                        >
                            <PlusIcon width={16} height={16} />{" "}
                            {actionItem.label}
                        </button>
                    ))}

                    <input
                        type="text"
                        placeholder="New owner address"
                        value={newOwner}
                        onChange={(e) =>
                            setNewOwner(e.target.value as Address)
                        }
                        className="mt-2 p-2 w-full border rounded-lg text-sm"
                    />

                    <input
                        type="text"
                        placeholder="Owner to remove"
                        value={ownerToRemove}
                        onChange={(e) =>
                            setOwnerToRemove(e.target.value as Address)
                        }
                        className="mt-2 p-2 w-full border rounded-lg text-sm"
                    />

                    {/* JSON output */}
                    <pre className="mt-4 p-4 w-full max-h-60 bg-gray-50 rounded-lg text-sm text-gray-800 overflow-auto">
                        {result
                            ? JSON.stringify(
                                  result,
                                  (_, value) =>
                                      typeof value === "bigint"
                                          ? `0x${value.toString(16)}`
                                          : value,
                                  2
                              )
                            : "Click a button to run an action."}
                    </pre>
                </div>
            </div>
        </main>
    );
}

export default SafeOwners;
