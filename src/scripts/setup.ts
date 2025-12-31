
import path from "node:path";
import { main as downloadProtos } from "./download-protos";
import { main as bundleProtos } from "./bundle-protos";
import { main as rewriteRelativeImports } from "./rewrite-relative-imports";
import { LUNAR_REPO_PATH, PROTO_BUNDLE_FILE_PATH, PROTO_FILES_DIR_PATH } from "../basePaths";

if(require.main === module) {
    main();   
}

export interface MainArgs {
    LUNAR_REPO_PATH: string;
    PROTO_FILES_DIR_PATH: string;
    PROTO_BUNDLE_FILE_PATH: string;
}

export function main(options?: MainArgs) {
    const protoFilesDir  = options?.PROTO_FILES_DIR_PATH   ? path.resolve(options.PROTO_FILES_DIR_PATH)   : PROTO_FILES_DIR_PATH;
    const bundleFilePath = options?.PROTO_BUNDLE_FILE_PATH ? path.resolve(options.PROTO_BUNDLE_FILE_PATH) : PROTO_BUNDLE_FILE_PATH;
    const lunarRepoPath  = options?.LUNAR_REPO_PATH        ? options.LUNAR_REPO_PATH                      : LUNAR_REPO_PATH;
    
    downloadProtos({ LUNAR_REPO_PATH: lunarRepoPath, PROTO_FILES_DIR_PATH: protoFilesDir });
    rewriteRelativeImports({ LUNAR_REPO_PATH: lunarRepoPath, PROTO_FILES_DIR_PATH: protoFilesDir });
    return bundleProtos({ PROTO_FILES_DIR_PATH: protoFilesDir, PROTO_BUNDLE_FILE_PATH: bundleFilePath });
}