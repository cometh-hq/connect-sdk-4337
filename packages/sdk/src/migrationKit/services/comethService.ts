import type { ProjectParams } from "../types";
import type { LEGACY_API } from "./LEGACY_API";

export const getLegacyProjectParams = async ({
    legacyApi,
}: { legacyApi: LEGACY_API }): Promise<ProjectParams> => {
    return await legacyApi.getProjectParams();
};
