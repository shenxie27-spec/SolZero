export const config = {
  port: Number(process.env.PORT || 8787),
  dbPath: process.env.DB_PATH || './data/solzero.db',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
  cluster: process.env.SOLZERO_CLUSTER || 'mainnet-beta',
  treasury: process.env.SOLZERO_TREASURY || 'B5FhC46zHEcurfhy7mn88jyq7GvTS73qpZ2R9aUVcKJe',
  feeRate: Number(process.env.SOLZERO_FEE_RATE || 0.1),
  inviteL1: Number(process.env.SOLZERO_INVITE_L1 || 0.2),
  inviteL2: Number(process.env.SOLZERO_INVITE_L2 || 0.05)
};