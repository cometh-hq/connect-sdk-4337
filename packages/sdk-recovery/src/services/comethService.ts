import type { ProjectParams } from "@/types";
import type { Chain } from "viem";
import type { API } from "./API";

export const getProjectParamsByChain = async ({
    api,
    chain,
}: { api: API; chain: Chain }): Promise<ProjectParams> => {
    return (await api.getProjectParams(chain.id)) as ProjectParams;
};
