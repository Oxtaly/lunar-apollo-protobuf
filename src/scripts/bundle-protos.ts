
import fs from "node:fs";
import path from "node:path";
import { SELF_MODULE_BASE_DIR, PROTO_FILES_DIR_PATH, PROTO_BUNDLE_FILE_PATH } from "./setup";
import { pbjs, pbts } from "protobufjs-cli"

if(require.main === module) {
    main();   
}

export interface MainArgs {
    PROTO_FILES_DIR_PATH: string;
    PROTO_BUNDLE_FILE_PATH?: string;
}

export async function main(options?: MainArgs) {
    const promises: Promise<void>[] = [];
    const protoFilesDir = options?.PROTO_FILES_DIR_PATH ? path.resolve(options.PROTO_FILES_DIR_PATH) : PROTO_FILES_DIR_PATH;
    const bundleFilePath = options?.PROTO_BUNDLE_FILE_PATH ? path.resolve(options.PROTO_BUNDLE_FILE_PATH) : PROTO_BUNDLE_FILE_PATH;

    if(!bundleFilePath.endsWith('.js'))
        throw new Error(`PROTO_BUNDLE_FILE_PATH ('${PROTO_BUNDLE_FILE_PATH}') must end in .js!`)
    
    const exists = fs.existsSync(protoFilesDir);
    if(!exists)
        throw new Error(`PROTO_FILES_DIR_PATH ('${protoFilesDir}') doesn't exists! Make sure script 'download-protos' was ran before this!`);
    if(exists) {
        const stats = fs.statSync(protoFilesDir);
        if(!stats.isDirectory())
            throw new Error(`PROTO_FILES_DIR_PATH ('${protoFilesDir}') exists but is not a directory!`);
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
        throw new Error(`No .proto files found in ('${protoFilesDir}')! Make sure script 'download-protos' was ran before this!`);

    // execSync(`npx pbjs -t static-module -w commonjs -o bundle.js ${files.join(' ')}`);
    // execSync(`npx pbts -o bundle.d.ts bundle.js`);
    const bundlePathBase = bundleFilePath.replace('.js', '');
    // ! For reflection, but after testing reflection is quite slower and in this specific use case requires static generation too.  
    // // promises.push(new Promise((resolve, reject) => {
    // //     pbjs.main([`-t`, 'json', '-o', bundleFilePath + '.json, ...filePaths], (error, output) => {
    // //         if(error) {
    // //             if(error?.message && error?.message.toString().startsWith('ENOENT')) {
    // //                 return reject(new Error(`An ENOENT error happened creating json bundle ('${bundleFilePath}.json')! Make sure script 'rewrite-relative-imports' was ran before this! Original error as cause.`, { cause: error }));
    // //             }
    // //             return reject(new Error(`An error happened creating json bundle ('${bundleFilePath}.json')! Original error as cause.`, { cause: error }));
    // //         }
    // //         fs.writeFileSync(bundleFilePath + '.json, output);
    // //         return resolve();
    // //     });
    // // }));
    promises.push(new Promise((resolve, reject) => {
        pbjs.main([`-t`, 'static-module', '-w', 'commonjs', '-o', bundlePathBase + '.js', ...filePaths], (error, output) => {
            if(error) {
                if(error?.message && error?.message.toString().startsWith('ENOENT')) {
                    return reject(new Error(`An ENOENT error happened creating js bundle for declarations ('${bundlePathBase}.js')! Make sure script 'rewrite-relative-imports' was ran before this! Original error as cause.`, { cause: error }));
                }
                return reject(new Error(`An error happened creating js bundle for declarations ('${bundlePathBase}.js')! Original error as cause.`, { cause: error }));
            }
            pbts.main(['-o', bundlePathBase + '.d.ts', bundlePathBase + '.js'], (error, output) => {
                if(error) {
                    if(error?.message && error?.message.toString().startsWith('ENOENT')) {
                        return reject(new Error(`An ENOENT error happened creating ts declaration bundle ('${bundlePathBase}.d.ts')! Make sure script 'rewrite-relative-imports' was ran before this! Original error as cause.`, { cause: error }));
                    }
                    return reject(new Error(`An error happened creating ts declaration bundle ('${bundlePathBase}.d.ts')! Original error as cause.`, { cause: error }));
                }
                fs.writeFileSync(bundlePathBase + '.d.ts', output);
                // ! Uncomment if reflection is being used
                // // fs.rmSync(tsBundlePathBase + '.js');
                return resolve();
            });
        });
    }));
    return Promise.all(promises);
}