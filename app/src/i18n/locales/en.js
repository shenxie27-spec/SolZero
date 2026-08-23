export default {
  appName: 'SolZero',
  tagline: 'Solana Wallet Cleaner · Reclaim SOL',
  tab: { home: 'Clean', checkin: 'Check-in', points: 'Points', invite: 'Invite', profile: 'Me' },
  common: {
    loading: 'Loading…', retry: 'Retry', confirm: 'Confirm', cancel: 'Cancel', back: 'Back', ok: 'OK',
    copy: 'Copy', copied: 'Copied', share: 'Share', logout: 'Log out', close: 'Close',
    points: 'Points', gasNote: 'A small on-chain fee is required'
  },
  login: {
    title: 'Welcome to SolZero',
    subtitle: 'Connect your Seed Vault wallet, clean empty accounts and junk tokens, and reclaim your locked SOL.',
    connect: 'Connect Seed Vault Wallet', connecting: 'Connecting…',
    inviteLabel: 'Invite code', invitePlaceholder: 'Optional', inviteOptional: 'Enter a friend’s invite code to unlock extra rewards for both of you',
    agree: 'By logging in you agree to the Terms of Service and Privacy Policy',
    failed: 'Connection failed, please retry',
    networkError: 'Wallet connected, but the login server is unreachable. Check your network and try again.',
    walletTimeout: 'Cannot open Seed Vault. Please open the system wallet app first, then try again.',
    skip: 'Browse as guest',
    guestHint: 'Guest mode: connect a wallet to use cleanup'
  },
  home: {
    title: 'Wallet Cleaner', subtitle: 'Scan empty token accounts and dust tokens',
    scan: 'Start Scan', scanning: 'Scanning…', rescan: 'Rescan',
    emptyTitle: 'Empty accounts', emptyDesc: 'Zero balance, closable to reclaim rent',
    dustTitle: 'Dust tokens', dustDesc: 'Untradeable or worthless, burn then close',
    selectAll: 'Select all', clearAll: 'Clear', listTitle: 'Accounts to clean',
    recovered: 'Total recovered', serviceFee: 'Service fee (10%)', youGet: 'You receive',
    estPoints: 'Estimated points', execute: 'Clean Now', executing: 'Working…',
    success: 'Cleanup complete!', successDesc: 'Rent reclaimed and points awarded',
    partial: 'Some transactions failed, please retry the failed ones',
    failed: 'Operation failed',
    needWallet: 'Connect your wallet first',
    nothing: 'Wallet is clean', nothingDesc: 'No empty accounts or dust tokens found',
    perAccount: '≈ {{sol}} SOL / account', unknownValue: 'Value unknown',
    confirmTitle: 'Confirm cleanup', confirmDesc: '{{count}} accounts will be closed, {{burn}} dust tokens will be burned. Burning is irreversible.'
  },
  checkin: {
    title: 'Daily Check-in', desc: 'On-chain check-in. The longer your streak, the more points per day',
    date: 'Date', streak: 'Streak', days: 'days', day: 'day',
    signed: 'Checked in today', notSigned: 'Not checked in yet',
    sign: 'Check in & earn points', signing: 'Signing…', verifying: 'Verifying…',
    awarded: '+{{points}} points', gasNote: 'Check-in is an on-chain transaction and requires a small SOL fee',
    ladderTitle: 'Streak rewards', tomorrow: 'Earn {{points}} points tomorrow',
    alreadyDone: 'Already checked in today. See you tomorrow!'
  },
  points: {
    title: 'My Points', balance: 'Balance', history: 'History',
    noHistory: 'No points yet. Clean your wallet or check in!',
    kindCheckin: 'Daily check-in', kindCleanup: 'Cleanup', kindReferralL1: 'Level-1 referral', kindReferralL2: 'Level-2 referral', kindAdjust: 'Adjustment',
    moreWelfare: 'More member benefits coming soon',
    welfareHint: 'The more points you hold, the more member benefits you unlock. Keep going!',
    leaderboard: 'Leaderboard', rank: 'Rank', me: 'Me'
  },
  invite: {
    title: 'Invite Friends', desc: 'When friends register with your code, you earn a bonus on their cleanup points',
    myCode: 'My invite code', copyCode: 'Copy code', shareInvite: 'Share',
    shareText: 'I use SolZero to clean my Solana wallet and reclaim SOL. Use my invite code {{code}} to earn points together!',
    l1: 'Level 1', l2: 'Level 2', l1Desc: '20% bonus', l2Desc: '5% bonus',
    earned: 'Referral points earned', downlines: 'My team', emptyDownlines: 'No team yet. Share your code!',
    rule1: 'Earn 20% of level-1 partners’ cleanup points', rule2: 'Earn 5% of level-2 partners’ cleanup points', rule3: 'Bonuses are granted by the platform, never deducted from partners'
  },
  profile: {
    title: 'Profile', wallet: 'Wallet', joined: 'Joined',
    language: 'Language', langZh: '简体中文', langEn: 'English', langJa: '日本語', langKo: '한국어',
    privacy: 'Privacy Policy', terms: 'Terms of Service',
    deleteAccount: 'Delete account', deleteConfirm: 'This deletes all your data permanently. Continue?',
    deleted: 'Account deleted', version: 'Version'
  }
};