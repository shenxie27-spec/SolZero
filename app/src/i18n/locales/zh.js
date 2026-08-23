export default {
  appName: 'SolZero',
  tagline: 'Solana 钱包清理 · 回收租金',
  tab: { home: '清理', checkin: '签到', points: '积分', invite: '邀请', profile: '我的' },
  common: {
    loading: '加载中…', retry: '重试', confirm: '确认', cancel: '取消', back: '返回', ok: '好的',
    copy: '复制', copied: '已复制', share: '分享', logout: '退出登录', close: '关闭',
    points: '积分', gasNote: '需要支付少量链上手续费'
  },
  login: {
    title: '欢迎使用 SolZero',
    subtitle: '连接种子库钱包，清理钱包里的空账户和垃圾代币，回收被锁定的 SOL。',
    connect: '连接种子库钱包', connecting: '正在连接…',
    inviteLabel: '邀请码', invitePlaceholder: '选填', inviteOptional: '输入好友的邀请码，绑定后双方都能获得更多福利',
    agree: '登录即代表同意《用户协议》与《隐私政策》',
    failed: '连接失败，请重试',
    networkError: '钱包已连接，但登录服务器不可用，请检查网络后重试',
    walletTimeout: '无法拉起种子库钱包，请先打开系统钱包（Seed Vault）后再试一次',
    skip: '先逛逛（游客模式）',
    guestHint: '游客模式：未连接钱包，清理功能暂不可用'
  },
  home: {
    title: '钱包清理', subtitle: '扫描空代币账户与粉尘代币',
    scan: '开始扫描', scanning: '正在扫描…', rescan: '重新扫描',
    emptyTitle: '空账户', emptyDesc: '余额为 0，可关闭回收租金',
    dustTitle: '粉尘代币', dustDesc: '无法交易或价值极低，可燃烧后关闭',
    selectAll: '全选', clearAll: '清空', listTitle: '可清理账户',
    recovered: '回收总额', serviceFee: '服务费（10%）', youGet: '预计到账',
    estPoints: '预计获得积分', execute: '一键清理', executing: '处理中…',
    success: '清理完成！', successDesc: '已回收租金并发放积分',
    partial: '部分交易未完成，请重试未成功的部分',
    failed: '操作失败',
    needWallet: '请先连接种子库钱包',
    nothing: '钱包很干净', nothingDesc: '没有发现可清理的空账户或粉尘代币',
    perAccount: '约 {{sol}} SOL / 账户', unknownValue: '价值未知',
    confirmTitle: '确认清理', confirmDesc: '将关闭 {{count}} 个账户，其中 {{burn}} 个粉尘代币将被燃烧。燃烧后不可恢复，请确认。'
  },
  checkin: {
    title: '每日签到', desc: '链上签到，连续天数越多，每天积分越高',
    date: '日期', streak: '连续签到', days: '天', day: '天',
    signed: '今日已签到', notSigned: '今日未签到',
    sign: '签到并领取积分', signing: '签名中…', verifying: '验证中…',
    awarded: '获得 {{points}} 积分', gasNote: '签到为一笔链上交易，需支付少量 SOL 手续费',
    ladderTitle: '连续签到奖励', tomorrow: '明天可得 {{points}} 积分',
    alreadyDone: '今天已经签到啦，明天再来！'
  },
  points: {
    title: '我的积分', balance: '当前积分', history: '积分明细',
    noHistory: '还没有积分记录，快去清理钱包或签到吧',
    kindCheckin: '每日签到', kindCleanup: '清理回收', kindReferralL1: '一级伙伴奖励', kindReferralL2: '二级伙伴奖励', kindAdjust: '调整',
    moreWelfare: '更多会员权益即将解锁',
    welfareHint: '积分越多，未来解锁的会员权益越多。继续积累吧！',
    leaderboard: '积分排行', rank: '排名', me: '我'
  },
  invite: {
    title: '邀请好友', desc: '好友通过你的邀请码注册，TA 每次清理获得的积分都会给你返点',
    myCode: '我的邀请码', copyCode: '复制邀请码', shareInvite: '分享邀请',
    shareText: '我在用 SolZero 清理 Solana 钱包回收 SOL，输入我的邀请码 {{code}}，一起赚积分！',
    l1: '一级伙伴', l2: '二级伙伴', l1Desc: '返点 20%', l2Desc: '返点 5%',
    earned: '已获返点积分', downlines: '我的伙伴', emptyDownlines: '还没有伙伴，快分享邀请码吧',
    rule1: '一级伙伴清理积分的 20% 返给你', rule2: '二级伙伴清理积分的 5% 返给你', rule3: '返点由平台额外发放，不从伙伴积分中扣除'
  },
  profile: {
    title: '我的', wallet: '钱包地址', joined: '注册时间',
    language: '语言', langZh: '简体中文', langEn: 'English', langJa: '日本語', langKo: '한국어',
    privacy: '隐私政策', terms: '用户协议',
    deleteAccount: '注销账号', deleteConfirm: '注销后将删除你的全部数据且不可恢复，确定继续吗？',
    deleted: '账号已注销', version: '版本'
  }
};