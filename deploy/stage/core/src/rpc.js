import { Connection } from '@solana/web3.js';
import { CLUSTERS } from './config.js';

export function getConnection(cluster = 'mainnet-beta') {
  const endpoint = CLUSTERS[cluster] || cluster;
  return new Connection(endpoint, 'confirmed');
}