
import fs from "node:fs";
import path from "node:path";
import { PROTO_FILES_DIR_PATH, LUNAR_REPO_PATH } from "../basePaths";

if(require.main === module) {
    main();   
}

export interface MainArgs {
    PROTO_FILES_DIR_PATH: string;
    LUNAR_REPO_PATH: string;
}

// TODO: Find a way to not have to modify the .proto files but supply some sort of "root path"

export function main(options?: MainArgs) {
    const lunarRepoPath = options?.LUNAR_REPO_PATH ? options.LUNAR_REPO_PATH : LUNAR_REPO_PATH;
    const protoFilesDir = options?.PROTO_FILES_DIR_PATH ? path.resolve(options.PROTO_FILES_DIR_PATH) : PROTO_FILES_DIR_PATH;
    
    const exists = fs.existsSync(protoFilesDir);
    if(!exists)
        throw new Error(`PROTO_FILES_DIR_PATH ${protoFilesDir} doesn't exists! Make sure script 'download-protos' was ran before this!`);
    if(exists) {
        const stats = fs.statSync(protoFilesDir);
        if(!stats.isDirectory())
            throw new Error(`PROTO_FILES_DIR_PATH ${protoFilesDir} exists but is not a directory!`);
    }

    const files = fs.readdirSync(protoFilesDir, { recursive: true, withFileTypes: true });
    const filePaths: string[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if(!file.isFile())
            continue;
        if(!file.name.endsWith('.proto'))
            continue;
        filePaths.push(path.join(file.parentPath, file.name));
    }

    if(!filePaths.length)
        throw new Error(`No .proto files found in ${protoFilesDir}! Make sure script 'download-protos' was ran before this!`);

    filePaths.forEach((filePath) => {
        try {
            let fileContents = fs.readFileSync(filePath).toString();
            fileContents = fileContents.replaceAll(`import "${lunarRepoPath}`, `import "${protoFilesDir.replaceAll('\\', '/')}/${lunarRepoPath}`);
            // Single apostrophe version
            fileContents = fileContents.replaceAll(`import '${lunarRepoPath}`, `import '${protoFilesDir.replaceAll('\\', '/')}/${lunarRepoPath}`);
            fs.writeFileSync(filePath, fileContents);
        } catch (error) {
            throw new Error(`An error happened rewriting relative imports on file ${filePath}! Original error as cause.`, { cause: error });
        }
    });

    return filePaths.length;
}