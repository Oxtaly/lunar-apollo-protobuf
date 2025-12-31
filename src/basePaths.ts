import path from "node:path";

export const LUNAR_REPO_PATH = 'lunarclient/apollo';

export const SELF_MODULE_BASE_DIR = path.join(__dirname, '../').replaceAll('\\', '/');
export const PROTO_FILES_DIR_PATH = path.join(SELF_MODULE_BASE_DIR, './bin/.proto').replaceAll('\\', '/');
export const PROTO_BUNDLE_FILE_PATH = path.join(SELF_MODULE_BASE_DIR, './bin/proto.bundle.js').replaceAll('\\', '/');