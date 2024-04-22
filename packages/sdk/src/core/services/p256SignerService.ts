import { encodePacked, getContractAddress, hexToBigInt, keccak256, type Hex } from "viem";
import type { PasskeySigner } from "../signers/types";
import { P256_SIGNER_FACTORY, P256_SIGNER_SINGLETON } from "@/constants";


export const predictSignerAddress = async (signer : PasskeySigner) => {

    const {x, y} = signer.passkey.pubkeyCoordinates;

    const salt = keccak256(encodePacked(['uint256', 'uint256'], [hexToBigInt(x), hexToBigInt(y)]))
  
    // Init code of minimal proxy from solady 0.0.123
    const initCode = `0x602c3d8160093d39f33d3d3d3d363d3d37363d73${P256_SIGNER_SINGLETON.substring(
      2
    )}5af43d3d93803e602a57fd5bf3` as Hex
  
    return  getContractAddress({ 
      bytecode: initCode, 
      from: P256_SIGNER_FACTORY, 
      opcode: 'CREATE2', 
      salt: salt, 
    })
}