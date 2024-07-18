"use client";

import React, { useState } from "react";

import { useConnect, useSendTransaction } from "@cometh/connect-react-hooks";
import countContractAbi from "../app/contract/counterABI.json";
import { encodeFunctionData } from "viem";

export const COUNTER_CONTRACT_ADDRESS =
    "0x4FbF9EE4B2AF774D4617eAb027ac2901a41a7b5F";


export default function App() {

    const { smartAccountClient, smartAccountAddress, updateSmartAccountClient } = useConnect();


    const calldata = encodeFunctionData({
        abi: countContractAbi,
        functionName: "count",
    });


    const {
        mutate,
        data,
        error,
        status,
        isPending,
    } = useSendTransaction();

    const test =  () => {
         updateSmartAccountClient()
    }

    const sendTx =  () => {
        console.log("yo")
        try{
            const transactions = {
                to: COUNTER_CONTRACT_ADDRESS,
                data: calldata,
                value: 0n
            }
             mutate({transactions})
        }catch(err){
            console.log(err)
        }
       
    }

    console.log({data})



    return (
        <div
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <div className="md:min-h-[70vh] gap-2 flex flex-col justify-center items-center">
                <div className="absolute left-1/2 z-10 mt-5 flex w-screen max-w-max -translate-x-1/2 px-4">
                    <div className="w-screen max-w-md flex-auto overflow-hidden rounded-3xl bg-white text-sm leading-6 shadow-lg ring-1 ring-gray-900/5">
                        TEST

                        <button onClick={test}>CONNECT</button>
                        {
                        smartAccountAddress && <button onClick={ sendTx}>SEND TX</button>
                    }
                    </div>

                    
                </div>
            </div>
        </div>
    );
}
