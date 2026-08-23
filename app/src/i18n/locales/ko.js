export default {
  appName: 'SolZero',
  tagline: 'Solana 지갑 정리 · SOL 회수',
  tab: { home: '정리', checkin: '출석', points: '포인트', invite: '초대', profile: '내정보' },
  common: {
    loading: '불러오는 중…', retry: '재시도', confirm: '확인', cancel: '취소', back: '뒤로', ok: '확인',
    copy: '복사', copied: '복사됨', share: '공유', logout: '로그아웃', close: '닫기',
    points: '포인트', gasNote: '소액의 체인 수수료가 필요합니다'
  },
  login: {
    title: 'SolZero에 오신 것을 환영합니다',
    subtitle: 'Seed Vault 지갑을 연결하고 빈 계정과 쓰레기 토큰을 정리해 잠긴 SOL을 회수하세요.',
    connect: 'Seed Vault 지갑 연결', connecting: '연결 중…',
    inviteLabel: '초대 코드', invitePlaceholder: '선택 사항', inviteOptional: '친구의 초대 코드를 입력하면 둘 다 추가 혜택을 받을 수 있어요',
    agree: '로그인하면 이용약관과 개인정보 처리방침에 동의하는 것입니다',
    failed: '연결 실패, 다시 시도해 주세요',
    networkError: '지갑은 연결됐지만 로그인 서버에 연결할 수 없습니다. 네트워크를 확인한 뒤 다시 시도해 주세요',
    walletTimeout: 'Seed Vault을 열 수 없습니다. 먼저 시스템 지갑 앱을 연 후 다시 시도하세요',
    skip: '게스트로 둘러보기',
    guestHint: '게스트 모드: 지갑을 연결해야 정리 기능을 사용할 수 있어요'
  },
  home: {
    title: '지갑 정리', subtitle: '빈 토큰 계정과 먼지 토큰 스캔',
    scan: '스캔 시작', scanning: '스캔 중…', rescan: '다시 스캔',
    emptyTitle: '빈 계정', emptyDesc: '잔액 0. 닫으면 렌트를 회수할 수 있어요',
    dustTitle: '먼지 토큰', dustDesc: '거래 불가 또는 가치가 거의 없음. 소각 후 닫기',
    selectAll: '전체 선택', clearAll: '해제', listTitle: '정리할 계정',
    recovered: '회수 합계', serviceFee: '서비스 수수료(10%)', youGet: '실수령 예상',
    estPoints: '예상 포인트', execute: '한 번에 정리', executing: '처리 중…',
    success: '정리 완료!', successDesc: '렌트를 회수하고 포인트를 지급했어요',
    partial: '일부 거래가 실패했습니다. 실패한 항목을 다시 시도해 주세요',
    failed: '작업 실패',
    needWallet: '먼저 지갑을 연결하세요',
    nothing: '지갑이 깨끗해요', nothingDesc: '정리할 빈 계정이나 먼지 토큰이 없습니다',
    perAccount: '계정당 약 {{sol}} SOL', unknownValue: '가치 알 수 없음',
    confirmTitle: '정리 확인', confirmDesc: '{{count}}개 계정을 닫고 {{burn}}개 먼지 토큰을 소각합니다. 소각은 되돌릴 수 없어요.'
  },
  checkin: {
    title: '매일 출석', desc: '온체인 출석. 연속일수가 길수록 하루 포인트가 늘어나요',
    date: '날짜', streak: '연속 출석', days: '일', day: '일',
    signed: '오늘 출석 완료', notSigned: '아직 출석 안 함',
    sign: '출석하고 포인트 받기', signing: '서명 중…', verifying: '확인 중…',
    awarded: '{{points}} 포인트 획득', gasNote: '출석은 온체인 거래라 소액의 SOL 수수료가 필요해요',
    ladderTitle: '연속 출석 보상', tomorrow: '내일 {{points}} 포인트를 받을 수 있어요',
    alreadyDone: '오늘은 이미 출석했어요. 내일 만나요!'
  },
  points: {
    title: '내 포인트', balance: '보유 포인트', history: '내역',
    noHistory: '아직 포인트가 없어요. 정리하거나 출석해 보세요',
    kindCheckin: '매일 출석', kindCleanup: '정리 회수', kindReferralL1: '1차 파트너 보상', kindReferralL2: '2차 파트너 보상', kindAdjust: '조정',
    moreWelfare: '더 많은 멤버 혜택 곧 공개',
    welfareHint: '포인트가 많을수록 앞으로 열리는 멤버 혜택이 많아집니다. 계속 모아보세요!',
    leaderboard: '포인트 순위', rank: '순위', me: '나'
  },
  invite: {
    title: '친구 초대', desc: '친구가 내 코드로 가입하면 친구의 정리 포인트에 따라 보너스를 받아요',
    myCode: '내 초대 코드', copyCode: '코드 복사', shareInvite: '공유하기',
    shareText: 'SolZero로 Solana 지갑을 정리하며 SOL을 회수하고 있어요. 초대 코드 {{code}}로 함께 포인트 모아요!',
    l1: '1차 파트너', l2: '2차 파트너', l1Desc: '20% 보너스', l2Desc: '5% 보너스',
    earned: '받은 보너스', downlines: '내 팀', emptyDownlines: '아직 팀이 없어요. 코드를 공유해 보세요!',
    rule1: '1차 파트너 정리 포인트의 20% 획득', rule2: '2차 파트너 정리 포인트의 5% 획득', rule3: '보너스는 플랫폼이 지급하며 파트너 포인트에서 차감되지 않아요'
  },
  profile: {
    title: '내 정보', wallet: '지갑 주소', joined: '가입일',
    language: '언어', langZh: '简体中文', langEn: 'English', langJa: '日本語', langKo: '한국어',
    privacy: '개인정보 처리방침', terms: '이용약관',
    deleteAccount: '계정 삭제', deleteConfirm: '모든 데이터가 영구 삭제됩니다. 계속할까요?',
    deleted: '계정이 삭제되었습니다', version: '버전'
  }
};