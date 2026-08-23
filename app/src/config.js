// 联调开关：true 指向电脑本地测试服务器 http://127.0.0.1:8787（真机需 adb reverse tcp:8787 tcp:8787 且电脑运行 server）
// 上架前必须改回 false（正式版指向 https://api.solzero.top）
export const USE_LOCAL_API = false;
export const API_URL = USE_LOCAL_API ? 'http://127.0.0.1:8787' : (__DEV__ ? 'http://10.0.2.2:8787' : 'https://api.solzero.top');
export const CHAIN = 'solana:mainnet-beta';
export const APP_NAME = 'SolZero';
export const TREASURY = 'B5FhC46zHEcurfhy7mn88jyq7GvTS73qpZ2R9aUVcKJe';
