export default {
  appName: 'SolZero',
  tagline: 'Solana ウォレット整理 · SOL 回収',
  tab: { home: '整理', checkin: 'チェックイン', points: 'ポイント', invite: '招待', profile: 'マイ' },
  common: {
    loading: '読み込み中…', retry: '再試行', confirm: '確認', cancel: 'キャンセル', back: '戻る', ok: 'OK',
    copy: 'コピー', copied: 'コピーしました', share: '共有', logout: 'ログアウト', close: '閉じる',
    points: 'ポイント', gasNote: '少額のチェーン手数料が必要です'
  },
  login: {
    title: 'SolZero へようこそ',
    subtitle: 'Seed Vault ウォレットを接続して、空アカウントとゴミトークンを整理し、ロックされた SOL を回収しましょう。',
    connect: 'Seed Vault ウォレットに接続', connecting: '接続中…',
    inviteLabel: '招待コード', invitePlaceholder: '任意', inviteOptional: '友達の招待コードを入力すると、お互いに特典があります',
    agree: 'ログインすると利用規約とプライバシーポリシーに同意したものとみなされます',
    failed: '接続に失敗しました。もう一度お試しください',
    networkError: 'ウォレットは接続されましたが、ログインサーバーに接続できません。ネットワークを確認して再試行してください',
    walletTimeout: 'Seed Vault を起動できません。先にシステムウォレットを開いてから再試行してください',
    skip: 'ゲストとして見て回る',
    guestHint: 'ゲストモード：ウォレット未接続のため、クリーンアップはご利用いただけません'
  },
  home: {
    title: 'ウォレット整理', subtitle: '空のトークンアカウントとダストトークンをスキャン',
    scan: 'スキャン開始', scanning: 'スキャン中…', rescan: '再スキャン',
    emptyTitle: '空アカウント', emptyDesc: '残高ゼロ。閉じて家賃（レント）を回収できます',
    dustTitle: 'ダストトークン', dustDesc: '取引不能または価値が極小。バーンしてから閉じます',
    selectAll: 'すべて選択', clearAll: 'クリア', listTitle: '整理対象アカウント',
    recovered: '回収合計', serviceFee: 'サービス手数料（10%）', youGet: '受取予定',
    estPoints: '獲得予定ポイント', execute: '一括整理', executing: '処理中…',
    success: '整理完了！', successDesc: 'レントを回収し、ポイントを付与しました',
    partial: '一部の取引が失敗しました。失敗分を再試行してください',
    failed: '操作に失敗しました',
    needWallet: 'まずウォレットを接続してください',
    nothing: 'ウォレットはクリーンです', nothingDesc: '空アカウントやダストトークンは見つかりませんでした',
    perAccount: '1 アカウント約 {{sol}} SOL', unknownValue: '価値不明',
    confirmTitle: '整理の確認', confirmDesc: '{{count}} 個のアカウントを閉じ、{{burn}} 個のダストトークンをバーンします。バーンは取り消せません。'
  },
  checkin: {
    title: '毎日チェックイン', desc: 'オンチェーンチェックイン。連続日数が多いほど毎日のポイントが増えます',
    date: '日付', streak: '連続日数', days: '日', day: '日',
    signed: '本日チェックイン済み', notSigned: '未チェックイン',
    sign: 'チェックインして獲得', signing: '署名中…', verifying: '確認中…',
    awarded: '{{points}} ポイント獲得', gasNote: 'チェックインはオンチェーン取引のため少額の SOL 手数料がかかります',
    ladderTitle: '連続チェックイン報酬', tomorrow: '明日は {{points}} ポイント獲得できます',
    alreadyDone: '本日はチェックイン済みです。また明日！'
  },
  points: {
    title: 'マイポイント', balance: '残高', history: '履歴',
    noHistory: 'まだポイントがありません。整理かチェックインをしましょう',
    kindCheckin: '毎日チェックイン', kindCleanup: '整理回収', kindReferralL1: '1 次パートナー報酬', kindReferralL2: '2 次パートナー報酬', kindAdjust: '調整',
    moreWelfare: 'さらなる会員特典は近日公開',
    welfareHint: 'ポイントが多いほど、今後アンロックされる会員特典が増えます。続けましょう！',
    leaderboard: 'ランキング', rank: '順位', me: '自分'
  },
  invite: {
    title: '友達を招待', desc: '友達があなたのコードで登録すると、その整理ポイントに応じてボーナスがもらえます',
    myCode: '招待コード', copyCode: 'コードをコピー', shareInvite: '共有する',
    shareText: 'SolZero で Solana ウォレットを整理して SOL を回収しています。招待コード {{code}} を使うと一緒にポイントが貯まります！',
    l1: '1 次パートナー', l2: '2 次パートナー', l1Desc: '20% ボーナス', l2Desc: '5% ボーナス',
    earned: '獲得ボーナス', downlines: 'マイチーム', emptyDownlines: 'まだチームがいません。コードを共有しましょう！',
    rule1: '1 次パートナーの整理ポイントの 20% を獲得', rule2: '2 次パートナーの整理ポイントの 5% を獲得', rule3: 'ボーナスはプラットフォームから付与され、パートナーから差し引かれません'
  },
  profile: {
    title: 'プロフィール', wallet: 'ウォレット', joined: '登録日',
    language: '言語', langZh: '简体中文', langEn: 'English', langJa: '日本語', langKo: '한국어',
    privacy: 'プライバシーポリシー', terms: '利用規約',
    deleteAccount: 'アカウント削除', deleteConfirm: 'すべてのデータが完全に削除されます。続行しますか？',
    deleted: 'アカウントを削除しました', version: 'バージョン'
  }
};