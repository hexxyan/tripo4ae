export type AnimationCategory =
  | 'locomotion' | 'dance' | 'combat' | 'sports'
  | 'emotion' | 'gesture' | 'idle' | 'special'
  | 'cross-species';

export type RigVersionLabel = 'v1.0' | 'v2.5';

export interface AnimationCatalogEntry {
  id: string;
  name: string;
  nameZh: string;
  category: AnimationCategory;
  rigVersion: RigVersionLabel;
  tags?: string[];
}

export const ANIMATION_CATEGORIES: AnimationCategory[] = [
  'locomotion', 'dance', 'combat', 'sports',
  'emotion', 'gesture', 'idle', 'special', 'cross-species',
];

export const MAX_ANIMATIONS_PER_RIG = 5;

const LOCOMOTION: AnimationCatalogEntry[] = [
  { id: 'preset:biped:walk', name: 'Walk', nameZh: '走路', category: 'locomotion', rigVersion: 'v1.0', tags: ['walk', 'forward', 'slow'] },
  { id: 'preset:biped:run', name: 'Run', nameZh: '跑步', category: 'locomotion', rigVersion: 'v1.0', tags: ['run', 'sprint', 'fast'] },
  { id: 'preset:biped:run_upstairs', name: 'Run Upstairs', nameZh: '上楼', category: 'locomotion', rigVersion: 'v1.0', tags: ['run', 'stairs', 'climb'] },
  { id: 'preset:biped:jump', name: 'Jump', nameZh: '跳跃', category: 'locomotion', rigVersion: 'v1.0', tags: ['jump', 'leap'] },
  { id: 'preset:biped:jump_down', name: 'Jump Down', nameZh: '跳下', category: 'locomotion', rigVersion: 'v1.0', tags: ['jump', 'drop', 'fall'] },
  { id: 'preset:biped:dive', name: 'Dive', nameZh: '潜水', category: 'locomotion', rigVersion: 'v1.0', tags: ['dive', 'swim', 'jump'] },
  { id: 'preset:biped:climb', name: 'Climb', nameZh: '攀爬', category: 'locomotion', rigVersion: 'v1.0', tags: ['climb', 'wall'] },
  { id: 'preset:biped:swim', name: 'Swim', nameZh: '游泳', category: 'locomotion', rigVersion: 'v1.0', tags: ['swim', 'water'] },
  { id: 'preset:biped:surf', name: 'Surf', nameZh: '冲浪', category: 'locomotion', rigVersion: 'v1.0', tags: ['surf', 'water', 'board'] },
  { id: 'preset:biped:flip', name: 'Flip', nameZh: '翻跟头', category: 'locomotion', rigVersion: 'v1.0', tags: ['flip', 'acrobatic'] },
  { id: 'preset:biped:jump_rope_01', name: 'Jump Rope 1', nameZh: '跳绳1', category: 'locomotion', rigVersion: 'v1.0', tags: ['jump', 'rope', 'cardio'] },
  { id: 'preset:biped:jump_rope_02', name: 'Jump Rope 2', nameZh: '跳绳2', category: 'locomotion', rigVersion: 'v1.0', tags: ['jump', 'rope', 'cardio'] },
  { id: 'preset:biped:swagger', name: 'Swagger', nameZh: '拽步走', category: 'locomotion', rigVersion: 'v1.0', tags: ['walk', 'cool', 'style'] },
  { id: 'preset:biped:turn', name: 'Turn', nameZh: '转身', category: 'locomotion', rigVersion: 'v1.0', tags: ['turn', 'rotate'] },
  { id: 'preset:biped:flee_01', name: 'Flee 1', nameZh: '逃跑1', category: 'locomotion', rigVersion: 'v1.0', tags: ['flee', 'run', 'scared'] },
  { id: 'preset:biped:flee_02', name: 'Flee 2', nameZh: '逃跑2', category: 'locomotion', rigVersion: 'v1.0', tags: ['flee', 'run', 'scared'] },
  { id: 'preset:biped:dribble', name: 'Dribble', nameZh: '运球', category: 'locomotion', rigVersion: 'v1.0', tags: ['basketball', 'dribble'] },
  { id: 'preset:biped:crossover_dribble', name: 'Crossover Dribble', nameZh: '交叉运球', category: 'locomotion', rigVersion: 'v1.0', tags: ['basketball', 'dribble'] },
  { id: 'preset:biped:warm_up', name: 'Warm Up', nameZh: '热身', category: 'locomotion', rigVersion: 'v1.0', tags: ['warm', 'exercise', 'stretch'] },
];

const DANCE: AnimationCatalogEntry[] = [
  { id: 'preset:biped:dance_01', name: 'Dance 1', nameZh: '舞蹈1', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_02', name: 'Dance 2', nameZh: '舞蹈2', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_03', name: 'Dance 3', nameZh: '舞蹈3', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_04', name: 'Dance 4', nameZh: '舞蹈4', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_05', name: 'Dance 5', nameZh: '舞蹈5', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_06', name: 'Dance 6', nameZh: '舞蹈6', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:freaky', name: 'Freaky Dance', nameZh: '搞怪舞', category: 'dance', rigVersion: 'v1.0', tags: ['dance', 'weird', 'funny'] },
];

const COMBAT: AnimationCatalogEntry[] = [
  { id: 'preset:biped:box_01', name: 'Box 1', nameZh: '拳击1', category: 'combat', rigVersion: 'v1.0', tags: ['box', 'punch', 'fight'] },
  { id: 'preset:biped:box_02', name: 'Box 2', nameZh: '拳击2', category: 'combat', rigVersion: 'v1.0', tags: ['box', 'punch', 'fight'] },
  { id: 'preset:biped:box_03', name: 'Box 3', nameZh: '拳击3', category: 'combat', rigVersion: 'v1.0', tags: ['box', 'punch', 'fight'] },
  { id: 'preset:biped:front_kick_01', name: 'Front Kick 1', nameZh: '前踢1', category: 'combat', rigVersion: 'v1.0', tags: ['kick', 'fight'] },
  { id: 'preset:biped:front_kick_02', name: 'Front Kick 2', nameZh: '前踢2', category: 'combat', rigVersion: 'v1.0', tags: ['kick', 'fight'] },
  { id: 'preset:biped:hit_to_body_01', name: 'Body Hit 1', nameZh: '身体受击1', category: 'combat', rigVersion: 'v1.0', tags: ['hit', 'damage', 'react'] },
  { id: 'preset:biped:hit_to_body_02', name: 'Body Hit 2', nameZh: '身体受击2', category: 'combat', rigVersion: 'v1.0', tags: ['hit', 'damage', 'react'] },
  { id: 'preset:biped:hit_to_head', name: 'Head Hit', nameZh: '头部受击', category: 'combat', rigVersion: 'v1.0', tags: ['hit', 'damage', 'react'] },
  { id: 'preset:biped:hit_to_side', name: 'Side Hit', nameZh: '侧面受击', category: 'combat', rigVersion: 'v1.0', tags: ['hit', 'damage', 'react'] },
  { id: 'preset:biped:hit_to_stomach', name: 'Stomach Hit', nameZh: '腹部受击', category: 'combat', rigVersion: 'v1.0', tags: ['hit', 'damage', 'react'] },
  { id: 'preset:biped:slash', name: 'Slash', nameZh: '挥砍', category: 'combat', rigVersion: 'v1.0', tags: ['slash', 'sword', 'attack'] },
  { id: 'preset:biped:chop', name: 'Chop', nameZh: '劈砍', category: 'combat', rigVersion: 'v1.0', tags: ['chop', 'sword', 'attack'] },
  { id: 'preset:biped:shoot', name: 'Shoot', nameZh: '射击', category: 'combat', rigVersion: 'v1.0', tags: ['shoot', 'gun', 'fire'] },
  { id: 'preset:biped:fire', name: 'Fire', nameZh: '开火', category: 'combat', rigVersion: 'v1.0', tags: ['fire', 'gun', 'shoot'] },
  { id: 'preset:biped:cast_a_spell', name: 'Cast Spell', nameZh: '施法', category: 'combat', rigVersion: 'v1.0', tags: ['magic', 'spell', 'cast'] },
  { id: 'preset:biped:hurt', name: 'Hurt', nameZh: '受伤', category: 'combat', rigVersion: 'v1.0', tags: ['hurt', 'damage', 'react'] },
  { id: 'preset:biped:fall', name: 'Fall', nameZh: '倒地', category: 'combat', rigVersion: 'v1.0', tags: ['fall', 'down', 'defeat'] },
];

const SPORTS: AnimationCatalogEntry[] = [
  { id: 'preset:biped:basketball_shot', name: 'Basketball Shot', nameZh: '投篮', category: 'sports', rigVersion: 'v1.0', tags: ['basketball', 'shot'] },
  { id: 'preset:biped:pitch_baseball', name: 'Pitch Baseball', nameZh: '棒球投球', category: 'sports', rigVersion: 'v1.0', tags: ['baseball', 'pitch', 'throw'] },
  { id: 'preset:biped:golf', name: 'Golf Swing', nameZh: '高尔夫挥杆', category: 'sports', rigVersion: 'v1.0', tags: ['golf', 'swing'] },
  { id: 'preset:biped:volleyball', name: 'Volleyball', nameZh: '排球', category: 'sports', rigVersion: 'v1.0', tags: ['volleyball', 'spike'] },
  { id: 'preset:biped:football_catch', name: 'Football Catch', nameZh: '接橄榄球', category: 'sports', rigVersion: 'v1.0', tags: ['football', 'catch'] },
  { id: 'preset:biped:football_save', name: 'Football Save', nameZh: '扑救', category: 'sports', rigVersion: 'v1.0', tags: ['football', 'goalie', 'save'] },
  { id: 'preset:biped:football_pass', name: 'Football Pass', nameZh: '传球', category: 'sports', rigVersion: 'v1.0', tags: ['football', 'pass', 'throw'] },
  { id: 'preset:biped:shovel', name: 'Shovel', nameZh: '铲子', category: 'sports', rigVersion: 'v1.0', tags: ['shovel', 'dig', 'labor'] },
  { id: 'preset:biped:dig', name: 'Dig', nameZh: '挖掘', category: 'sports', rigVersion: 'v1.0', tags: ['dig', 'labor'] },
  { id: 'preset:biped:press-up', name: 'Press Up', nameZh: '俯卧撑', category: 'sports', rigVersion: 'v1.0', tags: ['pushup', 'exercise', 'fitness'] },
  { id: 'preset:biped:cross_body_crunch', name: 'Cross Crunch', nameZh: '仰卧起坐', category: 'sports', rigVersion: 'v1.0', tags: ['crunch', 'exercise', 'fitness'] },
  { id: 'preset:biped:lift_heavy', name: 'Lift Heavy', nameZh: '举重', category: 'sports', rigVersion: 'v1.0', tags: ['lift', 'weight', 'strength'] },
];

const EMOTION: AnimationCatalogEntry[] = [
  { id: 'preset:biped:afraid', name: 'Afraid', nameZh: '害怕', category: 'emotion', rigVersion: 'v1.0', tags: ['afraid', 'fear', 'scared'] },
  { id: 'preset:biped:angry_01', name: 'Angry 1', nameZh: '生气1', category: 'emotion', rigVersion: 'v1.0', tags: ['angry', 'mad'] },
  { id: 'preset:biped:angry_02', name: 'Angry 2', nameZh: '生气2', category: 'emotion', rigVersion: 'v1.0', tags: ['angry', 'mad'] },
  { id: 'preset:biped:angry_03', name: 'Angry 3', nameZh: '生气3', category: 'emotion', rigVersion: 'v1.0', tags: ['angry', 'mad'] },
  { id: 'preset:biped:complain_01', name: 'Complain 1', nameZh: '抱怨1', category: 'emotion', rigVersion: 'v1.0', tags: ['complain'] },
  { id: 'preset:biped:complain_02', name: 'Complain 2', nameZh: '抱怨2', category: 'emotion', rigVersion: 'v1.0', tags: ['complain'] },
  { id: 'preset:biped:cry', name: 'Cry', nameZh: '哭', category: 'emotion', rigVersion: 'v1.0', tags: ['cry', 'sad', 'tears'] },
  { id: 'preset:biped:depressed', name: 'Depressed', nameZh: '沮丧', category: 'emotion', rigVersion: 'v1.0', tags: ['depressed', 'sad'] },
  { id: 'preset:biped:frightened', name: 'Frightened', nameZh: '惊恐', category: 'emotion', rigVersion: 'v1.0', tags: ['frightened', 'scared'] },
  { id: 'preset:biped:frustrated_01', name: 'Frustrated 1', nameZh: '挫败1', category: 'emotion', rigVersion: 'v1.0', tags: ['frustrated'] },
  { id: 'preset:biped:frustrated_02', name: 'Frustrated 2', nameZh: '挫败2', category: 'emotion', rigVersion: 'v1.0', tags: ['frustrated'] },
  { id: 'preset:biped:laugh_01', name: 'Laugh 1', nameZh: '笑1', category: 'emotion', rigVersion: 'v1.0', tags: ['laugh', 'happy'] },
  { id: 'preset:biped:laugh_02', name: 'Laugh 2', nameZh: '笑2', category: 'emotion', rigVersion: 'v1.0', tags: ['laugh', 'happy'] },
  { id: 'preset:biped:scared_01', name: 'Scared 1', nameZh: '恐惧1', category: 'emotion', rigVersion: 'v1.0', tags: ['scared', 'fear'] },
  { id: 'preset:biped:scared_02', name: 'Scared 2', nameZh: '恐惧2', category: 'emotion', rigVersion: 'v1.0', tags: ['scared', 'fear'] },
  { id: 'preset:biped:sob', name: 'Sob', nameZh: '啜泣', category: 'emotion', rigVersion: 'v1.0', tags: ['sob', 'cry', 'sad'] },
  { id: 'preset:biped:cheer', name: 'Cheer', nameZh: '欢呼', category: 'emotion', rigVersion: 'v1.0', tags: ['cheer', 'celebrate', 'happy'] },
  { id: 'preset:biped:defeat_02', name: 'Defeat 2', nameZh: '失败2', category: 'emotion', rigVersion: 'v1.0', tags: ['defeat', 'lose', 'sad'] },
  { id: 'preset:biped:defeat_03', name: 'Defeat 3', nameZh: '失败3', category: 'emotion', rigVersion: 'v1.0', tags: ['defeat', 'lose', 'sad'] },
];

const GESTURE: AnimationCatalogEntry[] = [
  { id: 'preset:biped:agree', name: 'Agree', nameZh: '同意', category: 'gesture', rigVersion: 'v1.0', tags: ['agree', 'nod', 'yes'] },
  { id: 'preset:biped:bow', name: 'Bow', nameZh: '鞠躬', category: 'gesture', rigVersion: 'v1.0', tags: ['bow', 'respect'] },
  { id: 'preset:biped:clap', name: 'Clap', nameZh: '鼓掌', category: 'gesture', rigVersion: 'v1.0', tags: ['clap', 'applaud'] },
  { id: 'preset:biped:greet_01', name: 'Greet 1', nameZh: '问候1', category: 'gesture', rigVersion: 'v1.0', tags: ['greet', 'wave', 'hello'] },
  { id: 'preset:biped:greet_02', name: 'Greet 2', nameZh: '问候2', category: 'gesture', rigVersion: 'v1.0', tags: ['greet', 'wave', 'hello'] },
  { id: 'preset:biped:greet_03', name: 'Greet 3', nameZh: '问候3', category: 'gesture', rigVersion: 'v1.0', tags: ['greet', 'wave', 'hello'] },
  { id: 'preset:biped:greet_04', name: 'Greet 4', nameZh: '问候4', category: 'gesture', rigVersion: 'v1.0', tags: ['greet', 'wave', 'hello'] },
  { id: 'preset:biped:heart_pose', name: 'Heart Pose', nameZh: '比心', category: 'gesture', rigVersion: 'v1.0', tags: ['heart', 'love', 'cute'] },
  { id: 'preset:biped:hug', name: 'Hug', nameZh: '拥抱', category: 'gesture', rigVersion: 'v1.0', tags: ['hug', 'embrace'] },
  { id: 'preset:biped:fold_arms', name: 'Fold Arms', nameZh: '抱臂', category: 'gesture', rigVersion: 'v1.0', tags: ['fold', 'arms'] },
  { id: 'preset:biped:make_a_call_01', name: 'Make Call 1', nameZh: '打电话1', category: 'gesture', rigVersion: 'v1.0', tags: ['call', 'phone'] },
  { id: 'preset:biped:make_a_call_02', name: 'Make Call 2', nameZh: '打电话2', category: 'gesture', rigVersion: 'v1.0', tags: ['call', 'phone'] },
  { id: 'preset:biped:play_mobile_game', name: 'Play Mobile', nameZh: '玩手游', category: 'gesture', rigVersion: 'v1.0', tags: ['mobile', 'game', 'phone'] },
  { id: 'preset:biped:play_video_game', name: 'Play Video Game', nameZh: '玩视频游戏', category: 'gesture', rigVersion: 'v1.0', tags: ['game', 'controller'] },
  { id: 'preset:biped:wave_goodbye_01', name: 'Wave Goodbye 1', nameZh: '挥手告别1', category: 'gesture', rigVersion: 'v1.0', tags: ['wave', 'bye', 'goodbye'] },
  { id: 'preset:biped:wave_goodbye_02', name: 'Wave Goodbye 2', nameZh: '挥手告别2', category: 'gesture', rigVersion: 'v1.0', tags: ['wave', 'bye', 'goodbye'] },
  { id: 'preset:biped:look_around', name: 'Look Around', nameZh: '环顾', category: 'gesture', rigVersion: 'v1.0', tags: ['look', 'search', 'curious'] },
  { id: 'preset:biped:victory_celebration', name: 'Victory', nameZh: '胜利庆祝', category: 'gesture', rigVersion: 'v1.0', tags: ['victory', 'win', 'celebrate'] },
  { id: 'preset:biped:scratch', name: 'Scratch', nameZh: '挠痒', category: 'gesture', rigVersion: 'v1.0', tags: ['scratch', 'itch'] },
  { id: 'preset:biped:sing_01', name: 'Sing 1', nameZh: '唱歌1', category: 'gesture', rigVersion: 'v1.0', tags: ['sing', 'song'] },
  { id: 'preset:biped:sing_02', name: 'Sing 2', nameZh: '唱歌2', category: 'gesture', rigVersion: 'v1.0', tags: ['sing', 'song'] },
  { id: 'preset:biped:sing_03', name: 'Sing 3', nameZh: '唱歌3', category: 'gesture', rigVersion: 'v1.0', tags: ['sing', 'song'] },
  { id: 'preset:biped:sing_04', name: 'Sing 4', nameZh: '唱歌4', category: 'gesture', rigVersion: 'v1.0', tags: ['sing', 'song'] },
];

const IDLE: AnimationCatalogEntry[] = [
  { id: 'preset:biped:idle', name: 'Idle', nameZh: '待机', category: 'idle', rigVersion: 'v1.0', tags: ['idle', 'stand', 'wait'] },
  { id: 'preset:biped:standing_relax', name: 'Standing Relax', nameZh: '放松站立', category: 'idle', rigVersion: 'v1.0', tags: ['idle', 'relax', 'stand'] },
  { id: 'preset:biped:wait', name: 'Wait', nameZh: '等待', category: 'idle', rigVersion: 'v1.0', tags: ['wait', 'idle'] },
  { id: 'preset:biped:sit', name: 'Sit', nameZh: '坐下', category: 'idle', rigVersion: 'v1.0', tags: ['sit', 'chair', 'idle'] },
];

const CROSS_SPECIES: AnimationCatalogEntry[] = [
  { id: 'preset:idle', name: 'Idle (Universal)', nameZh: '待机(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['idle', 'universal'] },
  { id: 'preset:walk', name: 'Walk (Universal)', nameZh: '走路(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['walk', 'universal'] },
  { id: 'preset:run', name: 'Run (Universal)', nameZh: '跑步(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['run', 'universal'] },
  { id: 'preset:dive', name: 'Dive (Universal)', nameZh: '潜水(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['dive', 'universal'] },
  { id: 'preset:climb', name: 'Climb (Universal)', nameZh: '攀爬(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['climb', 'universal'] },
  { id: 'preset:jump', name: 'Jump (Universal)', nameZh: '跳跃(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['jump', 'universal'] },
  { id: 'preset:slash', name: 'Slash (Universal)', nameZh: '挥砍(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['slash', 'universal'] },
  { id: 'preset:shoot', name: 'Shoot (Universal)', nameZh: '射击(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['shoot', 'universal'] },
  { id: 'preset:hurt', name: 'Hurt (Universal)', nameZh: '受伤(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['hurt', 'universal'] },
  { id: 'preset:fall', name: 'Fall (Universal)', nameZh: '倒地(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['fall', 'universal'] },
  { id: 'preset:turn', name: 'Turn (Universal)', nameZh: '转身(通用)', category: 'cross-species', rigVersion: 'v2.5', tags: ['turn', 'universal'] },
  { id: 'preset:quadruped:walk', name: 'Quadruped Walk', nameZh: '四足行走', category: 'cross-species', rigVersion: 'v2.5', tags: ['quadruped', 'walk', 'animal'] },
  { id: 'preset:hexapod:walk', name: 'Hexapod Walk', nameZh: '六足行走', category: 'cross-species', rigVersion: 'v2.5', tags: ['hexapod', 'walk', 'insect'] },
  { id: 'preset:octopod:walk', name: 'Octopod Walk', nameZh: '八足行走', category: 'cross-species', rigVersion: 'v2.5', tags: ['octopod', 'walk', 'spider'] },
  { id: 'preset:serpentine:march', name: 'Serpentine March', nameZh: '蛇行', category: 'cross-species', rigVersion: 'v2.5', tags: ['snake', 'serpentine', 'slither'] },
  { id: 'preset:aquatic:march', name: 'Aquatic March', nameZh: '水生游行', category: 'cross-species', rigVersion: 'v2.5', tags: ['fish', 'aquatic', 'swim'] },
];

export const BIPED_ANIMATIONS_V1: AnimationCatalogEntry[] = [
  ...LOCOMOTION, ...DANCE, ...COMBAT, ...SPORTS,
  ...EMOTION, ...GESTURE, ...IDLE,
];

export const CROSS_SPECIES_ANIMATIONS_V25: AnimationCatalogEntry[] = CROSS_SPECIES;

export const ANIMATION_CATALOG: AnimationCatalogEntry[] = [
  ...BIPED_ANIMATIONS_V1,
  ...CROSS_SPECIES_ANIMATIONS_V25,
];

export function getAnimationsForRigType(rigType: string): AnimationCatalogEntry[] {
  if (rigType === 'biped') return ANIMATION_CATALOG;
  return CROSS_SPECIES_ANIMATIONS_V25;
}

export function searchAnimations(
  query: string,
  pool: AnimationCatalogEntry[] = ANIMATION_CATALOG,
): AnimationCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return pool;
  return pool.filter((e) =>
    e.name.toLowerCase().includes(q) ||
    e.nameZh.includes(query.trim()) ||
    (e.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
    e.category.toLowerCase().includes(q),
  );
}
