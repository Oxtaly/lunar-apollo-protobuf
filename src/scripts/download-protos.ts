
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { LUNAR_REPO_PATH, PROTO_FILES_DIR_PATH } from "../basePaths";

if(require.main === module) {
    main();   
}

export interface MainArgs {
    PROTO_FILES_DIR_PATH?: string;
    LUNAR_REPO_PATH?: string;
    noDirCheckOrClear?: boolean;
}

export function main(options?: MainArgs) {
    const lunarRepoPath = options?.LUNAR_REPO_PATH ? options.LUNAR_REPO_PATH : LUNAR_REPO_PATH;
    const protoFilesDir = options?.PROTO_FILES_DIR_PATH ? path.resolve(options.PROTO_FILES_DIR_PATH) : PROTO_FILES_DIR_PATH;
    
    if(options?.noDirCheckOrClear !== true) {
        const exists = fs.existsSync(protoFilesDir);
        if(exists) {
            const stats = fs.statSync(protoFilesDir);
            if(!stats.isDirectory())
                throw new Error(`PROTO_FILES_DIR ${protoFilesDir} exists but is not a directory!`);
        }
        
        // clear previous files
        if(exists)
            fs.rmSync(protoFilesDir, { force: true, recursive: true });
        fs.mkdirSync(protoFilesDir, { recursive: true });
    }

    return execSync(`npx buf export buf.build/${lunarRepoPath} -o ${protoFilesDir}`);
}