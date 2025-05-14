"use client";

import { useState } from "react";
import type { Address } from "viem";
import type { Chain } from "viem/chains";

interface RecoveryTestProps {
  smartAccount: any;
  apiKey: string;
  effectiveDelayAddress?: Address;
  delayModuleAddress?: Address;
  guardianAddress?: Address;
  chain: Chain;
}

export default function RecoveryTest({
  smartAccount,
  apiKey,
  effectiveDelayAddress,
  delayModuleAddress,
  guardianAddress,
  chain,
}: RecoveryTestProps) {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<any>) => {
    try {
      setError(null);
      const res = await fn();
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <div className="space-y-2 p-4">
      <button onClick={() => run(() => smartAccount.setUpRecoveryModule({ apiKey }))}>
        setUpRecoveryModule
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.isRecoveryActive({
            apiKey,
            effectiveDelayAddress,
          })
        )
      }>
        isRecoveryActive
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.getRecoveryRequest({
            apiKey,
            effectiveDelayAddress,
          })
        )
      }>
        getRecoveryRequest
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.cancelRecoveryRequest({
            apiKey,
            effectiveDelayAddress,
          })
        )
      }>
        cancelRecoveryRequest
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.getDelayModuleAddress({
            apiKey,
            cooldown: 60,
            expiration: 120,
          })
        )
      }>
        getDelayModuleAddress
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.getGuardianAddress({
            delayModuleAddress: delayModuleAddress!,
          })
        )
      }>
        getGuardianAddress
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.addGuardian({
            delayModuleAddress: delayModuleAddress!,
            guardianAddress: guardianAddress!,
          })
        )
      }>
        addGuardian
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.disableGuardian({
            apiKey,
            guardianAddress: guardianAddress!,
          })
        )
      }>
        disableGuardian
      </button>

      <button onClick={() =>
        run(() =>
          smartAccount.setupCustomDelayModule({
            apiKey,
            guardianAddress: guardianAddress!,
            cooldown: 60,
            expiration: 120,
          })
        )
      }>
        setupCustomDelayModule
      </button>

      {result && (
        <pre className="bg-gray-100 text-sm p-2 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      {error && <div className="text-red-500">Error: {error}</div>}
    </div>
  );
}
