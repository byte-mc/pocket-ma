export type TranslationKey =
  | 'appSub'
  | 'downloadingModel'
  | 'downloadOnce'
  | 'loadingModel'
  | 'somethingWentWrong'
  | 'whatsTheSituation'
  | 'bulletDescribe'
  | 'bulletQuestions'
  | 'setYourLocation'
  | 'tapToChange'
  | 'forRegionSpecific'
  | 'assessNow'
  | 'thinkingLabel'
  | 'describeSymptom'
  | 'presetChestPain'
  | 'presetBreathing'
  | 'presetFever'
  | 'presetHeadache'
  | 'presetRash'
  | 'presetStomach'
  | 'presetAnkle'
  | 'presetBite'
  | 'loadingVision'
  | 'visionOnce'
  | 'menuSession'
  | 'menuKnowledge'
  | 'sessions'
  | 'newSession'
  | 'noPastSessions'
  | 'now'
  | 'knowledgeBase'
  | 'change'
  | 'setLocationPrompt'
  | 'refreshKnowledge'
  | 'checkingUpdates'
  | 'upToDate'
  | 'selectLocation'
  | 'selectLocationSub'
  | 'clearLocation'
  | 'pastSession'
  | 'newShort'
  | 'noContent'
  | 'noContentSub'
  | 'addImage'
  | 'chooseSource'
  | 'camera'
  | 'gallery'
  | 'cancel'
  | 'permissionRequired'
  | 'micPermissionMsg'
  | 'voiceError'
  | 'error'
  | 'visionError'
  | 'triageSeverity'
  | 'triageLikelyCause'
  | 'triageImmediateAction'
  | 'triageSeekHelp'
  | 'sevLow'
  | 'sevMedium'
  | 'sevHigh'
  | 'sevEmergency';

type Translations = Record<TranslationKey, string>;

export const translations: Record<string, Translations> = {
  en: {
    appSub: 'AI Medical Assistant',
    downloadingModel: 'Downloading AI model',
    downloadOnce: '~3.1 GB · one-time download',
    loadingModel: 'Loading model into memory…',
    somethingWentWrong: 'Something went wrong',
    whatsTheSituation: "What's the situation?",
    bulletDescribe: '· Describe your symptom by text, voice, or photo.',
    bulletQuestions: "· I'll ask a couple of questions, then assess.",
    setYourLocation: 'Set your location',
    tapToChange: 'Tap to change region',
    forRegionSpecific: 'For region-specific triage',
    assessNow: '⚡ Assess Now',
    thinkingLabel: 'Thinking',
    describeSymptom: 'Describe symptom…',
    presetChestPain: 'Chest pain',
    presetBreathing: 'Difficulty breathing',
    presetFever: 'High fever & chills',
    presetHeadache: 'Severe headache',
    presetRash: 'Rash on skin',
    presetStomach: 'Stomach pain & diarrhea',
    presetAnkle: 'Twisted ankle',
    presetBite: 'Animal bite / wound',
    loadingVision: 'Loading vision model',
    visionOnce: '~985 MB · one-time download',
    menuSession: 'Session',
    menuKnowledge: 'Knowledge Base',
    sessions: 'Sessions',
    newSession: '＋ New Session',
    noPastSessions: 'No sessions yet.',
    now: 'Now',
    knowledgeBase: 'Knowledge Base',
    change: 'Change',
    setLocationPrompt: '📍 Set a location to see regional conditions',
    refreshKnowledge: '↻ Refresh Knowledge Base',
    checkingUpdates: 'Checking for updates…',
    upToDate: 'Knowledge base is up to date.',
    selectLocation: 'Select Your Location',
    selectLocationSub: 'Adjusts probable causes to regional disease patterns',
    clearLocation: 'Clear location',
    pastSession: 'Past session — read only',
    newShort: '＋ New',
    noContent: 'No content',
    noContentSub: 'This session was saved before message history was stored.',
    addImage: 'Add Image',
    chooseSource: 'Choose source',
    camera: 'Camera',
    gallery: 'Gallery',
    cancel: 'Cancel',
    permissionRequired: 'Permission required',
    micPermissionMsg: 'Microphone access is needed for voice input.',
    voiceError: 'Voice error',
    error: 'Error',
    visionError: 'Failed to load vision model: ',
    triageSeverity: 'Severity',
    triageLikelyCause: 'Likely cause',
    triageImmediateAction: 'Immediate action',
    triageSeekHelp: 'Seek help if',
    sevLow: 'LOW',
    sevMedium: 'MEDIUM',
    sevHigh: 'HIGH',
    sevEmergency: 'EMERGENCY',
  },
  zh: {
    appSub: 'AI 医疗助手',
    downloadingModel: '正在下载 AI 模型',
    downloadOnce: '约 3.1 GB · 仅需下载一次',
    loadingModel: '正在加载模型…',
    somethingWentWrong: '出现错误',
    whatsTheSituation: '您有什么症状？',
    bulletDescribe: '· 用文字、语音或照片描述您的症状。',
    bulletQuestions: '· 我会问您几个问题，然后给出评估。',
    setYourLocation: '设置您的位置',
    tapToChange: '点击更换地区',
    forRegionSpecific: '获取地区性评估',
    assessNow: '⚡ 立即评估',
    thinkingLabel: '思考中',
    describeSymptom: '描述症状…',
    presetChestPain: '胸痛',
    presetBreathing: '呼吸困难',
    presetFever: '高烧与发冷',
    presetHeadache: '剧烈头痛',
    presetRash: '皮疹',
    presetStomach: '腹痛与腹泻',
    presetAnkle: '扭伤脚踝',
    presetBite: '动物咬伤 / 伤口',
    loadingVision: '正在加载视觉模型',
    visionOnce: '约 985 MB · 仅需下载一次',
    menuSession: '会话',
    menuKnowledge: '知识库',
    sessions: '会话记录',
    newSession: '＋ 新建会话',
    noPastSessions: '暂无会话记录。',
    now: '当前',
    knowledgeBase: '知识库',
    change: '更换',
    setLocationPrompt: '📍 设置位置以查看地区病况',
    refreshKnowledge: '↻ 刷新知识库',
    checkingUpdates: '正在检查更新…',
    upToDate: '知识库已是最新。',
    selectLocation: '选择您的位置',
    selectLocationSub: '根据地区疾病模式调整可能病因',
    clearLocation: '清除位置',
    pastSession: '历史会话 — 只读',
    newShort: '＋ 新建',
    noContent: '暂无内容',
    noContentSub: '该会话保存于消息记录功能上线之前。',
    addImage: '添加图片',
    chooseSource: '选择来源',
    camera: '相机',
    gallery: '相册',
    cancel: '取消',
    permissionRequired: '需要权限',
    micPermissionMsg: '语音输入需要麦克风权限。',
    voiceError: '语音错误',
    error: '错误',
    visionError: '无法加载视觉模型：',
    triageSeverity: '严重程度',
    triageLikelyCause: '可能原因',
    triageImmediateAction: '即时处置',
    triageSeekHelp: '出现以下情况请就医',
    sevLow: '低',
    sevMedium: '中',
    sevHigh: '高',
    sevEmergency: '紧急',
  },
};
