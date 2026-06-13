# External Model Rigging & Animation Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step Rig Wizard that runs the full Tripo rig chain (prerigcheck → rig → retarget) on any external model in the Library, exposing all 117 official Tripo animations through a Search-First UI.

**Architecture:** New `RigWizard/` component tree under `src/client/components/`, backed by a new `useRigChain` hook (orchestration) and a new `src/shared/animations.ts` catalog (117 entries). Entry points: Library card button + Animation tab CTA — both open the same modal. Reuses existing `TripoApiService.createTask` / `TaskPoller` / `useStore.upsertModel` — no new API surface or store changes needed.

**Tech Stack:** React 19, Zustand, TypeScript, Jest + jsdom + @testing-library/react. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-06-13-external-model-rigging-wizard-design.md`](../specs/2026-06-13-external-model-rigging-wizard-design.md)

---

## File Structure

**Create:**
- `src/shared/animations.ts` — 117-entry animation catalog constant
- `src/client/hooks/useRigChain.ts` — rig → retarget → download → import orchestrator
- `src/client/components/RigWizard/index.tsx` — modal shell with 4-step state machine
- `src/client/components/RigWizard/StepSelectModel.tsx`
- `src/client/components/RigWizard/StepPreRigCheck.tsx`
- `src/client/components/RigWizard/StepSelectAnimation.tsx`
- `src/client/components/RigWizard/StepExecute.tsx`
- `__tests__/shared/animations.test.ts`
- `__tests__/hooks/useRigChain.test.ts`
- `__tests__/components/RigWizard/StepSelectAnimation.test.tsx`
- `__tests__/components/RigWizard/index.test.tsx`

**Modify:**
- `src/shared/types.ts` — add `AnimationCatalogEntry`, `AnimationCategory`, `RigVersionLabel`, `RigWizardState`
- `src/client/components/LibraryTab/index.tsx` — add "Rig & Animate" button to each model card
- `src/client/components/AnimationTab/index.tsx` — add top-of-tab "Rig External Model" CTA button
- `src/client/hooks/useTranslation.ts` — add Wizard-related strings

**No changes to:**
- `src/client/services/tripoApi.ts` (existing `createTask({type:'animate_prerigcheck', ...})` etc. already covers the chain)
- `src/client/stores/useStore.ts` (uses existing `upsertModel`)
- `src/client/hooks/useCsInterface.ts` (no JSX calls needed — rig chain is React-side)
- `src/jsx/aeft/aeft.ts` (reuses existing `importModel`)

---

## Task 1: Animation Catalog Constant

**Files:**
- Create: `src/shared/animations.ts`
- Test: `__tests__/shared/animations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/shared/animations.test.ts`:

```typescript
import {
  ANIMATION_CATALOG,
  BIPED_ANIMATIONS_V1,
  CROSS_SPECIES_ANIMATIONS_V25,
  ANIMATION_CATEGORIES,
  getAnimationsForRigType,
  searchAnimations,
  type AnimationCatalogEntry,
} from '../../src/shared/animations';

describe('animations catalog', () => {
  it('has exactly 101 biped v1.0 entries', () => {
    expect(BIPED_ANIMATIONS_V1.length).toBe(101);
  });

  it('has exactly 16 cross-species v2.5 entries', () => {
    expect(CROSS_SPECIES_ANIMATIONS_V25.length).toBe(16);
  });

  it('has 117 total entries in ANIMATION_CATALOG', () => {
    expect(ANIMATION_CATALOG.length).toBe(117);
  });

  it('has no duplicate ids', () => {
    const ids = ANIMATION_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has all required fields', () => {
    for (const entry of ANIMATION_CATALOG) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.name).toBe('string');
      expect(typeof entry.nameZh).toBe('string');
      expect(ANIMATION_CATEGORIES).toContain(entry.category);
      expect(['v1.0', 'v2.5']).toContain(entry.rigVersion);
    }
  });

  it('v1.0 entries use preset:biped: prefix', () => {
    for (const entry of BIPED_ANIMATIONS_V1) {
      expect(entry.id).toMatch(/^preset:biped:/);
    }
  });

  it('exposes expected category list', () => {
    expect(ANIMATION_CATEGORIES).toEqual([
      'locomotion', 'dance', 'combat', 'sports',
      'emotion', 'gesture', 'idle', 'special', 'cross-species',
    ]);
  });

  it('getAnimationsForRigType returns all 117 for biped', () => {
    const all = getAnimationsForRigType('biped');
    expect(all.length).toBe(117);
  });

  it('getAnimationsForRigType returns only v2.5 for quadruped', () => {
    const quad = getAnimationsForRigType('quadruped');
    expect(quad.length).toBe(16);
    expect(quad.every((e) => e.rigVersion === 'v2.5')).toBe(true);
  });

  it('searchAnimations matches on name (case-insensitive)', () => {
    const results = searchAnimations('walk');
    expect(results.some((e) => e.id === 'preset:biped:walk')).toBe(true);
    expect(results.some((e) => e.id === 'preset:walk')).toBe(true);
  });

  it('searchAnimations matches on nameZh', () => {
    const results = searchAnimations('走');
    expect(results.some((e) => e.id === 'preset:biped:walk' || e.id === 'preset:walk')).toBe(true);
  });

  it('searchAnimations matches on tags', () => {
    const results = searchAnimations('basketball');
    expect(results.some((e) => e.id === 'preset:biped:basketball_shot')).toBe(true);
  });

  it('searchAnimations returns empty array for no match', () => {
    expect(searchAnimations('xyzzy_nothing_matches')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/shared/animations.test.ts`
Expected: FAIL with "Cannot find module '../../src/shared/animations'"

- [ ] **Step 3: Create the catalog file**

Create `src/shared/animations.ts` with the complete 117-entry catalog. The structure:

```typescript
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
```

Then the full 117-entry array. **Locomotion (19, all v1.0):**

```typescript
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
```

**Dance (7, all v1.0):**

```typescript
const DANCE: AnimationCatalogEntry[] = [
  { id: 'preset:biped:dance_01', name: 'Dance 1', nameZh: '舞蹈1', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_02', name: 'Dance 2', nameZh: '舞蹈2', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_03', name: 'Dance 3', nameZh: '舞蹈3', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_04', name: 'Dance 4', nameZh: '舞蹈4', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_05', name: 'Dance 5', nameZh: '舞蹈5', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:dance_06', name: 'Dance 6', nameZh: '舞蹈6', category: 'dance', rigVersion: 'v1.0', tags: ['dance'] },
  { id: 'preset:biped:freaky', name: 'Freaky Dance', nameZh: '搞怪舞', category: 'dance', rigVersion: 'v1.0', tags: ['dance', 'weird', 'funny'] },
];
```

**Combat (17, all v1.0):**

```typescript
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
```

**Sports (12, all v1.0):**

```typescript
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
```

**Emotion (19, all v1.0):**

```typescript
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
```

**Gesture (23, all v1.0):**

```typescript
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
```

**Idle (4, all v1.0):**

```typescript
const IDLE: AnimationCatalogEntry[] = [
  { id: 'preset:biped:idle', name: 'Idle', nameZh: '待机', category: 'idle', rigVersion: 'v1.0', tags: ['idle', 'stand', 'wait'] },
  { id: 'preset:biped:standing_relax', name: 'Standing Relax', nameZh: '放松站立', category: 'idle', rigVersion: 'v1.0', tags: ['idle', 'relax', 'stand'] },
  { id: 'preset:biped:wait', name: 'Wait', nameZh: '等待', category: 'idle', rigVersion: 'v1.0', tags: ['wait', 'idle'] },
  { id: 'preset:biped:sit', name: 'Sit', nameZh: '坐下', category: 'idle', rigVersion: 'v1.0', tags: ['sit', 'chair', 'idle'] },
];
```

**Cross-Species (16, all v2.5):**

```typescript
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
```

**Aggregate + helpers:**

```typescript
export const BIPED_ANIMATIONS_V1: AnimationCatalogEntry[] = [
  ...LOCOMOTION, ...DANCE, ...COMBAT, ...SPORTS,
  ...EMOTION, ...GESTURE, ...IDLE,
];

export const CROSS_SPECIES_ANIMATIONS_V25: AnimationCatalogEntry[] = CROSS_SPECIES;

export const ANIMATION_CATALOG: AnimationCatalogEntry[] = [
  ...BIPED_ANIMATIONS_V1,
  ...CROSS_SPECIES_ANIMATIONS_V25,
];

export const MAX_ANIMATIONS_PER_RIG = 5;

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

export function getCategoryCount(category: AnimationCategory, pool: AnimationCatalogEntry[] = ANIMATION_CATALOG): number {
  return pool.filter((e) => e.category === category).length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/shared/animations.test.ts`
Expected: PASS (12 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/shared/animations.ts __tests__/shared/animations.test.ts
git commit -m "feat: add 117-entry Tripo animation catalog with categorization

101 biped v1.0 (locomotion/dance/combat/sports/emotion/gesture/idle)
+ 16 cross-species v2.5. Includes searchAnimations and getAnimationsForRigType
helpers used by the Rig Wizard."
```

---

## Task 2: Wizard Types

**Files:**
- Modify: `src/shared/types.ts` (append at end)

- [ ] **Step 1: Add the types**

Append to `src/shared/types.ts`:

```typescript
// === Rig Wizard ===

export interface RigCheckResult {
  riggable: boolean;
  rigType: RigType;
  message?: string;
}

export type RigWizardStep = 'select-model' | 'pre-rig-check' | 'select-animation' | 'execute';

export interface AnimationExecutionState {
  animationId: string;
  animationName: string;
  status: 'queued' | 'rigging' | 'retargeting' | 'downloading' | 'importing' | 'done' | 'failed';
  progress: number;
  error?: string;
  resultTaskId?: string;
  resultModelPath?: string;
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add Rig Wizard type definitions"
```

---

## Task 3: useRigChain Hook

This hook orchestrates: rig (once) → retarget (per animation) → download → upsert to store.

**Files:**
- Create: `src/client/hooks/useRigChain.ts`
- Test: `__tests__/hooks/useRigChain.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useRigChain.test.ts`:

```typescript
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useRigChain } from '../../src/client/hooks/useRigChain';
import { useStore } from '../../src/client/stores/useStore';
import type { TripoTask } from '../../src/shared/types';

jest.mock('../../src/client/services/tripoApi');

const { TripoApiServiceMock } = jest.requireMock('../../src/client/services/tripoApi');

beforeEach(() => {
  jest.clearAllMocks();
  useStore.getState().reset();
  useStore.getState().setApiKey('test-key');
});

function makeTask(overrides: Partial<TripoTask> = {}): TripoTask {
  return {
    task_id: 'task-' + Math.random().toString(36).slice(2, 8),
    type: 'animate_retarget',
    status: 'success',
    input: {},
    output: { model: 'https://example.com/model.glb', consumed_credit: 1 },
    progress: 100,
    create_time: Date.now(),
    ...overrides,
  };
}

describe('useRigChain', () => {
  it('runs rig once for multiple animations', async () => {
    const rigTask = makeTask({ task_id: 'rig-001', type: 'animate_rig' });
    const retargetTask1 = makeTask({ task_id: 'retarget-001' });
    const retargetTask2 = makeTask({ task_id: 'retarget-002' });

    let rigCallCount = 0;
    TripoApiServiceMock.createTask.mockImplementation(async (req: any) => {
      if (req.type === 'animate_rig') {
        rigCallCount++;
        return 'rig-001';
      }
      if (req.type === 'animate_retarget') {
        return req.animations?.[0]?.includes('walk') ? 'retarget-001' : 'retarget-002';
      }
      throw new Error('Unexpected task type: ' + req.type);
    });

    TripoApiServiceMock.getTask.mockImplementation(async (id: string) => {
      if (id === 'rig-001') return rigTask;
      if (id === 'retarget-001') return retargetTask1;
      if (id === 'retarget-002') return retargetTask2;
      throw new Error('Unknown task: ' + id);
    });

    TripoApiServiceMock.downloadTaskResult.mockResolvedValue('/tmp/model.glb');

    const { result } = renderHook(() => useRigChain());

    await act(async () => {
      await result.current.executeChain({
        modelTaskId: 'model-001',
        rigType: 'biped',
        animations: [
          { id: 'preset:biped:walk', name: 'Walk' },
          { id: 'preset:biped:run', name: 'Run' },
        ],
        onProgress: () => {},
      });
    });

    expect(rigCallCount).toBe(1);
    expect(TripoApiServiceMock.createTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animate_rig',
      original_model_task_id: 'model-001',
      rig_type: 'biped',
    }));
    expect(TripoApiServiceMock.createTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animate_retarget',
      original_model_task_id: 'rig-001',
      animations: ['preset:biped:walk'],
    }));
    expect(TripoApiServiceMock.createTask).toHaveBeenCalledWith(expect.objectContaining({
      type: 'animate_retarget',
      original_model_task_id: 'rig-001',
      animations: ['preset:biped:run'],
    }));
  });

  it('adds each successful retarget to the Library store', async () => {
    TripoApiServiceMock.createTask.mockImplementation(async (req: any) => {
      if (req.type === 'animate_rig') return 'rig-001';
      if (req.type === 'animate_retarget') return 'retarget-' + req.animations[0];
      throw new Error('Unexpected');
    });
    TripoApiServiceMock.getTask.mockResolvedValue(makeTask());
    TripoApiServiceMock.downloadTaskResult.mockResolvedValue('/tmp/anim.glb');

    const { result } = renderHook(() => useRigChain());

    await act(async () => {
      await result.current.executeChain({
        modelTaskId: 'model-001',
        rigType: 'biped',
        animations: [{ id: 'preset:biped:walk', name: 'Walk' }],
        onProgress: () => {},
      });
    });

    const models = useStore.getState().models;
    expect(models.length).toBe(1);
    expect(models[0].name).toContain('Walk');
    expect(models[0].modelPath).toBe('/tmp/anim.glb');
  });

  it('continues other animations when one retarget fails', async () => {
    TripoApiServiceMock.createTask.mockImplementation(async (req: any) => {
      if (req.type === 'animate_rig') return 'rig-001';
      if (req.type === 'animate_retarget') {
        return req.animations[0] === 'preset:biped:walk' ? 'fail-task' : 'ok-task';
      }
      throw new Error('Unexpected');
    });
    TripoApiServiceMock.getTask.mockImplementation(async (id: string) => {
      if (id === 'fail-task') return makeTask({ task_id: id, status: 'failed', error_msg: 'nope' });
      return makeTask({ task_id: id });
    });
    TripoApiServiceMock.downloadTaskResult.mockResolvedValue('/tmp/anim.glb');

    const { result } = renderHook(() => useRigChain());
    const states: any[] = [];

    await act(async () => {
      await result.current.executeChain({
        modelTaskId: 'model-001',
        rigType: 'biped',
        animations: [
          { id: 'preset:biped:walk', name: 'Walk' },
          { id: 'preset:biped:run', name: 'Run' },
        ],
        onProgress: (s) => states.push(s.map((x: any) => ({ id: x.animationId, status: x.status }))),
      });
    });

    const finalState = states[states.length - 1];
    const walk = finalState.find((s: any) => s.id === 'preset:biped:walk');
    const run = finalState.find((s: any) => s.id === 'preset:biped:run');
    expect(walk.status).toBe('failed');
    expect(run.status).toBe('done');

    const models = useStore.getState().models;
    expect(models.length).toBe(1);
    expect(models[0].name).toContain('Run');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useRigChain.test.ts`
Expected: FAIL with "Cannot find module '../../src/client/hooks/useRigChain'"

- [ ] **Step 3: Create the TripoApiService mock**

Add to `__tests__/services/tripoApi.test.ts` is NOT the right place. Create a shared mock at `__tests__/__mocks__/tripoApi.ts` is also overkill. Use `jest.mock` factory inline in the test file with named exports. Update the mock setup at the top of the test file (already done above via `jest.mock(...)` + `jest.requireMock(...)`).

Create the manual mock factory the test references. Update `__tests__/hooks/useRigChain.test.ts` to use this pattern at top:

```typescript
jest.mock('../../src/client/services/tripoApi', () => ({
  TripoApiService: jest.fn().mockImplementation(() => ({
    createTask: jest.fn(),
    getTask: jest.fn(),
    downloadTaskResult: jest.fn(),
    getModelUrl: jest.fn((o: any) => o?.model || o?.pbr_model || o?.base_model),
  })),
  __esModule: true,
}));

const { TripoApiService } = jest.requireMock('../../src/client/services/tripoApi');
const TripoApiServiceMock: any = {
  createTask: jest.fn(),
  getTask: jest.fn(),
  downloadTaskResult: jest.fn(),
  getModelUrl: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (TripoApiService as any).mockImplementation(() => TripoApiServiceMock);
  useStore.getState().reset();
  useStore.getState().setApiKey('test-key');
});
```

Replace the existing `const { TripoApiServiceMock }` line with the above setup.

- [ ] **Step 4: Implement useRigChain**

Create `src/client/hooks/useRigChain.ts`:

```typescript
import { useCallback, useRef } from 'react';
import { TripoApiService } from '../services/tripoApi';
import { TaskPoller } from '../services/taskPoller';
import { useStore } from '../stores/useStore';
import type {
  RigType, TripoTask, ModelRecord,
  RigCheckResult, AnimationExecutionState,
} from '../../shared/types';
import { getAnimationsForRigType } from '../../shared/animations';

interface ExecuteChainParams {
  modelTaskId: string;
  rigType: RigType;
  animations: Array<{ id: string; name: string }>;
  onProgress?: (states: AnimationExecutionState[]) => void;
}

interface ExecuteChainResult {
  rigTaskId: string | null;
  states: AnimationExecutionState[];
}

interface PrerigCheckParams {
  modelTaskId: string;
}

export function useRigChain() {
  const apiKey = useStore((s) => s.apiKey);
  const upsertModel = useStore((s) => s.upsertModel);
  const apiRef = useRef<TripoApiService | null>(null);

  if (apiKey && !apiRef.current) {
    apiRef.current = new TripoApiService(apiKey);
  }
  if (!apiKey && apiRef.current) {
    apiRef.current = null;
  }

  const runPrerigCheck = useCallback(async (
    params: PrerigCheckParams,
  ): Promise<RigCheckResult> => {
    const api = apiRef.current;
    if (!api) throw new Error('API key not configured');

    const taskId = await api.createTask({
      type: 'animate_prerigcheck',
      original_model_task_id: params.modelTaskId,
    });

    const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
    const task = await poller.pollUntilDone(taskId, { onProgress: () => {} });

    const riggable = task.output?.riggable !== false;
    const rigType = (task.output?.rig_type as RigType) || 'biped';
    return {
      riggable,
      rigType,
      message: riggable
        ? undefined
        : (task.error_msg || 'Model is not riggable.'),
    };
  }, []);

  const executeChain = useCallback(async (
    params: ExecuteChainParams,
  ): Promise<ExecuteChainResult> => {
    const api = apiRef.current;
    if (!api) throw new Error('API key not configured');

    const states: AnimationExecutionState[] = params.animations.map((a) => ({
      animationId: a.id,
      animationName: a.name,
      status: 'queued',
      progress: 0,
    }));
    params.onProgress?.([...states]);

    // Step 1: rig (once)
    for (const s of states) {
      s.status = 'rigging';
      s.progress = 5;
      params.onProgress?.([...states]);
    }

    const rigTaskId = await api.createTask({
      type: 'animate_rig',
      original_model_task_id: params.modelTaskId,
      rig_type: params.rigType,
      out_format: 'glb',
    });

    const poller = new TaskPoller({ getTask: (id) => api.getTask(id) });
    const rigTask = await poller.pollUntilDone(rigTaskId, {
      onProgress: (p) => {
        const scaled = 5 + Math.floor(p * 20);
        for (const s of states) {
          if (s.status === 'rigging') s.progress = scaled;
        }
        params.onProgress?.([...states]);
      },
    });

    if (rigTask.status !== 'success') {
      throw new Error(`Rig task failed: ${rigTask.error_msg || 'unknown error'}`);
    }

    // Step 2-4: per-animation retarget → download → store
    const saveDir = TripoApiService.getModelSaveDir();

    for (let i = 0; i < params.animations.length; i++) {
      const anim = params.animations[i];
      const state = states[i];
      try {
        state.status = 'retargeting';
        state.progress = 25;
        params.onProgress?.([...states]);

        const retargetTaskId = await api.createTask({
          type: 'animate_retarget',
          original_model_task_id: rigTaskId,
          animations: [anim.id],
          out_format: 'glb',
          bake_animation: true,
          export_with_geometry: true,
        });

        const retargetTask: TripoTask = await poller.pollUntilDone(retargetTaskId, {
          onProgress: (p) => {
            state.progress = 25 + Math.floor(p * 50);
            params.onProgress?.([...states]);
          },
        });

        if (retargetTask.status !== 'success') {
          throw new Error(retargetTask.error_msg || 'Retarget failed');
        }

        state.status = 'downloading';
        state.progress = 80;
        state.resultTaskId = retargetTaskId;
        params.onProgress?.([...states]);

        const modelPath = await api.downloadTaskResult(retargetTask, saveDir, (bytes, total) => {
          if (total > 0) state.progress = 80 + Math.floor((bytes / total) * 15);
          params.onProgress?.([...states]);
        });

        state.status = 'importing';
        state.progress = 95;
        state.resultModelPath = modelPath;
        params.onProgress?.([...states]);

        const newModel: ModelRecord = {
          id: retargetTaskId,
          taskId: retargetTaskId,
          name: `${anim.name}`,
          modelPath,
          thumbnailUrl: retargetTask.output?.rendered_image,
          thumbnailPath: TripoApiService.getLocalThumbnailPath(retargetTaskId),
          format: 'GLB',
          workflow: 'advanced3d',
          createdAt: Date.now(),
          pipelineSteps: [
            { type: 'animate_rig', taskId: rigTaskId, status: 'success', params: { type: 'animate_rig', original_model_task_id: params.modelTaskId } },
            { type: 'animate_retarget', taskId: retargetTaskId, status: 'success', params: { type: 'animate_retarget', original_model_task_id: rigTaskId, animations: [anim.id] } },
          ],
        };
        upsertModel(newModel);

        state.status = 'done';
        state.progress = 100;
        params.onProgress?.([...states]);
      } catch (err: any) {
        console.error(`[Tripo4AE] Chain failed for ${anim.id}:`, err);
        state.status = 'failed';
        state.error = err.message || String(err);
        params.onProgress?.([...states]);
      }
    }

    return { rigTaskId, states };
  }, [upsertModel]);

  return { runPrerigCheck, executeChain };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/hooks/useRigChain.test.ts`
Expected: PASS (3 tests passing)

- [ ] **Step 6: Commit**

```bash
git add src/client/hooks/useRigChain.ts __tests__/hooks/useRigChain.test.ts
git commit -m "feat: add useRigChain hook for rig → retarget → store orchestration

Rig task fires once per model and is reused across all selected animations.
Each retarget result lands in the Library store via upsertModel. Per-animation
failures do not block other animations."
```

---

## Task 4: Translations

**Files:**
- Modify: `src/client/hooks/useTranslation.ts`

- [ ] **Step 1: Read current translations file**

Run: `head -40 src/client/hooks/useTranslation.ts` to see the existing `en`/`zh` object structure.

- [ ] **Step 2: Add new keys to both `en` and `zh` translation objects**

Add these keys to the `en` object:

```typescript
rigWizardTitle: 'Rig & Animate',
rigWizardStep1: '1. Select Model',
rigWizardStep2: '2. Pre-Rig Check',
rigWizardStep3: '3. Select Animation',
rigWizardStep4: '4. Execute',
rigExternalModelBtn: 'Rig External Model',
rigAnimateCardBtn: 'Rig & Animate',
rigCheckRunning: 'Checking if model can be rigged...',
rigCheckRiggable: 'Riggable! Detected type:',
rigCheckNotRiggable: 'This model cannot be rigged.',
rigCheckError: 'Pre-rig check failed.',
searchAnimations: 'Search animations...',
categoryAll: 'All',
categoryLocomotion: 'Locomotion',
categoryDance: 'Dance',
categoryCombat: 'Combat',
categorySports: 'Sports',
categoryEmotion: 'Emotion',
categoryGesture: 'Gesture',
categoryIdle: 'Idle',
categorySpecial: 'Special',
categoryCrossSpecies: 'Cross-Species',
selectedCount: 'Selected',
maxSelections: 'max',
nextBtn: 'Next',
backBtn: 'Back',
cancelBtn: 'Cancel',
executeBtn: 'Execute',
closeBtn: 'Close',
statusQueued: 'Queued',
statusRigging: 'Rigging',
statusRetargeting: 'Retargeting',
statusDownloading: 'Downloading',
statusImporting: 'Importing',
statusDone: 'Done',
statusFailed: 'Failed',
emptyLibrary: 'No models in Library. Generate or import one first.',
```

Add the corresponding `zh` keys:

```typescript
rigWizardTitle: '骨骼绑定与动画',
rigWizardStep1: '1. 选择模型',
rigWizardStep2: '2. 预绑定检查',
rigWizardStep3: '3. 选择动画',
rigWizardStep4: '4. 执行',
rigExternalModelBtn: '绑定外部模型',
rigAnimateCardBtn: '绑定并动画',
rigCheckRunning: '正在检查模型是否可绑定...',
rigCheckRiggable: '可绑定！检测类型：',
rigCheckNotRiggable: '该模型无法绑定骨骼。',
rigCheckError: '预绑定检查失败。',
searchAnimations: '搜索动画...',
categoryAll: '全部',
categoryLocomotion: '移动',
categoryDance: '舞蹈',
categoryCombat: '战斗',
categorySports: '运动',
categoryEmotion: '情绪',
categoryGesture: '手势',
categoryIdle: '待机',
categorySpecial: '特殊',
categoryCrossSpecies: '跨物种',
selectedCount: '已选',
maxSelections: '上限',
nextBtn: '下一步',
backBtn: '上一步',
cancelBtn: '取消',
executeBtn: '执行',
closeBtn: '关闭',
statusQueued: '排队中',
statusRigging: '绑定中',
statusRetargeting: '动画重定向中',
statusDownloading: '下载中',
statusImporting: '导入中',
statusDone: '完成',
statusFailed: '失败',
emptyLibrary: 'Library 中没有模型，请先生成或导入。',
```

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Run translation tests**

Run: `npx jest __tests__/hooks/useTranslation.test.ts`
Expected: PASS (existing tests should still pass; the new keys auto-work via the fallback)

- [ ] **Step 5: Commit**

```bash
git add src/client/hooks/useTranslation.ts
git commit -m "feat: add zh/en translations for Rig Wizard"
```

---

## Task 5: Step 1 — Select Model

**Files:**
- Create: `src/client/components/RigWizard/StepSelectModel.tsx`

- [ ] **Step 1: Implement Step 1 component**

Create `src/client/components/RigWizard/StepSelectModel.tsx`:

```typescript
import React from 'react';
import { useStore } from '../../stores/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { ThumbnailImage } from '../common/ThumbnailImage';
import { TripoApiService } from '../../services/tripoApi';
import type { ModelRecord } from '../../../shared/types';

interface Props {
  apiKey: string | null;
  selectedModelId: string | null;
  onSelect: (model: ModelRecord) => void;
}

export function StepSelectModel({ apiKey, selectedModelId, onSelect }: Props) {
  const models = useStore((s) => s.models);
  const { t } = useTranslation();

  if (models.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 11, color: '#888' }}>{t('emptyLibrary')}</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {models.map((model) => {
        const isSelected = model.id === selectedModelId;
        return (
          <button
            key={model.id}
            onClick={() => onSelect(model)}
            style={isSelected ? styles.cardSelected : styles.card}
          >
            <div style={styles.thumb}>
              <ThumbnailImage
                taskId={model.taskId}
                thumbnailUrl={model.thumbnailUrl}
                thumbnailPath={model.thumbnailPath}
                api={apiKey ? new TripoApiService(apiKey) : null}
                style={styles.thumbImg}
                fallbackText="3D"
              />
            </div>
            <div style={styles.info}>
              <div style={styles.name}>{model.name}</div>
              <div style={styles.meta}>{model.format} · {model.taskId?.slice(0, 8)}</div>
            </div>
            {isSelected && <span style={styles.check}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, minHeight: 200,
  },
  container: {
    display: 'flex', flexDirection: 'column', gap: 6,
    maxHeight: 360, overflowY: 'auto', padding: 4,
  },
  card: {
    display: 'flex', gap: 8, padding: 6, alignItems: 'center',
    border: '1px solid #333', borderRadius: 4,
    backgroundColor: '#252525', cursor: 'pointer',
    textAlign: 'left' as const,
  },
  cardSelected: {
    display: 'flex', gap: 8, padding: 6, alignItems: 'center',
    border: '1px solid #4a9eff', borderRadius: 4,
    backgroundColor: '#2a3a4f', cursor: 'pointer',
    textAlign: 'left' as const,
  },
  thumb: {
    width: 36, height: 36, flexShrink: 0,
    backgroundColor: '#333', borderRadius: 3, overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  info: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  name: {
    fontSize: 10, fontWeight: 600, color: '#e0e0e0',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meta: { fontSize: 9, color: '#777' },
  check: { color: '#4a9eff', fontSize: 14, fontWeight: 700 },
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/client/components/RigWizard/StepSelectModel.tsx
git commit -m "feat: Rig Wizard Step 1 (model selection)"
```

---

## Task 6: Step 2 — Pre-Rig Check

**Files:**
- Create: `src/client/components/RigWizard/StepPreRigCheck.tsx`

- [ ] **Step 1: Implement Step 2 component**

Create `src/client/components/RigWizard/StepPreRigCheck.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { useRigChain } from '../../hooks/useRigChain';
import { useTranslation } from '../../hooks/useTranslation';
import type { ModelRecord, RigCheckResult } from '../../../shared/types';

interface Props {
  model: ModelRecord;
  onComplete: (result: RigCheckResult) => void;
  onBack: () => void;
}

export function StepPreRigCheck({ model, onComplete, onBack }: Props) {
  const { runPrerigCheck } = useRigChain();
  const { t } = useTranslation();
  const [state, setState] = useState<'running' | 'success' | 'failed'>('running');
  const [result, setResult] = useState<RigCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await runPrerigCheck({ modelTaskId: model.taskId });
        if (!active) return;
        setResult(r);
        setState(r.riggable ? 'success' : 'failed');
      } catch (err: any) {
        if (!active) return;
        setError(err.message || String(err));
        setState('failed');
      }
    })();
    return () => { active = false; };
  }, [model.taskId, runPrerigCheck]);

  return (
    <div style={styles.container}>
      <div style={styles.modelName}>{model.name}</div>

      {state === 'running' && (
        <div style={styles.row}>
          <span style={styles.spinner}>⏳</span>
          <span style={styles.text}>{t('rigCheckRunning')}</span>
        </div>
      )}

      {state === 'success' && result && (
        <>
          <div style={styles.row}>
            <span style={{ ...styles.badge, ...styles.badgeOk }}>✓</span>
            <span style={styles.text}>
              {t('rigCheckRiggable')} <b>{result.rigType}</b>
            </span>
          </div>
          <button onClick={() => onComplete(result)} style={styles.primaryBtn}>
            {t('nextBtn')} →
          </button>
        </>
      )}

      {state === 'failed' && (
        <>
          <div style={styles.row}>
            <span style={{ ...styles.badge, ...styles.badgeFail }}>✗</span>
            <span style={styles.text}>
              {result && !result.riggable ? t('rigCheckNotRiggable') : t('rigCheckError')}
            </span>
          </div>
          {result?.message && <div style={styles.message}>{result.message}</div>}
          {error && <div style={styles.message}>{error}</div>}
          <button onClick={onBack} style={styles.secondaryBtn}>{t('backBtn')}</button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 12, padding: 12, minHeight: 200 },
  modelName: { fontSize: 11, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 },
  row: { display: 'flex', gap: 8, alignItems: 'center' },
  spinner: { fontSize: 16 },
  text: { fontSize: 11, color: '#ccc' },
  badge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 18, height: 18, borderRadius: 9, fontSize: 11, fontWeight: 700,
  },
  badgeOk: { backgroundColor: '#1b321b', color: '#4caf50' },
  badgeFail: { backgroundColor: '#3a1a1a', color: '#ff6b6b' },
  message: {
    padding: '6px 8px', fontSize: 10, color: '#ff6b6b',
    backgroundColor: '#3a1a1a', border: '1px solid #662222', borderRadius: 3,
  },
  primaryBtn: {
    padding: '6px 14px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 3,
    color: '#4a9eff', fontWeight: 600, alignSelf: 'flex-start',
  },
  secondaryBtn: {
    padding: '6px 14px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2b2b2b', border: '1px solid #555', borderRadius: 3,
    color: '#ccc', alignSelf: 'flex-start',
  },
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/client/components/RigWizard/StepPreRigCheck.tsx
git commit -m "feat: Rig Wizard Step 2 (pre-rig check)"
```

---

## Task 7: Step 3 — Select Animation (Search-First Grid)

This is the most complex component. Test covers: search filter, multi-select cap, category filter.

**Files:**
- Create: `src/client/components/RigWizard/StepSelectAnimation.tsx`
- Test: `__tests__/components/RigWizard/StepSelectAnimation.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/RigWizard/StepSelectAnimation.test.tsx`:

```typescript
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepSelectAnimation } from '../../../src/client/components/RigWizard/StepSelectAnimation';

jest.mock('../../../src/client/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        searchAnimations: 'Search...',
        selectedCount: 'Selected',
        maxSelections: 'max',
        nextBtn: 'Next',
        backBtn: 'Back',
        categoryAll: 'All',
      };
      return map[key] ?? key;
    },
  }),
}));

describe('StepSelectAnimation', () => {
  const mockOnComplete = jest.fn();
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 117 animations when search empty', () => {
    render(
      <StepSelectAnimation
        rigType="biped"
        selected={[]}
        onSelectionChange={() => {}}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );
    const cards = screen.getAllByRole('button', { name: /preset:/ });
    expect(cards.length).toBe(117);
  });

  it('filters by search query (case-insensitive, matches name)', () => {
    render(
      <StepSelectAnimation
        rigType="biped"
        selected={[]}
        onSelectionChange={() => {}}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'walk' } });

    const cards = screen.getAllByRole('button', { name: /preset:/ });
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards.some((c) => c.textContent?.includes('Walk'))).toBe(true);
  });

  it('caps selection at MAX_ANIMATIONS_PER_RIG (5)', () => {
    const onSelectionChange = jest.fn();
    render(
      <StepSelectAnimation
        rigType="biped"
        selected={[]}
        onSelectionChange={onSelectionChange}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );

    const cards = screen.getAllByRole('button', { name: /preset:biped/ });
    // Click first 6 cards; only 5 should fire onSelectionChange with non-empty array
    for (let i = 0; i < 6; i++) {
      fireEvent.click(cards[i]);
    }

    const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1];
    expect(lastCall[0].length).toBeLessThanOrEqual(5);
  });

  it('filters by category chip', () => {
    render(
      <StepSelectAnimation
        rigType="biped"
        selected={[]}
        onSelectionChange={() => {}}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );

    const danceChip = screen.getByText('Dance', { selector: 'button' });
    fireEvent.click(danceChip);

    const cards = screen.getAllByRole('button', { name: /preset:/ });
    expect(cards.length).toBe(7);
  });

  it('Next button is disabled when nothing selected', () => {
    render(
      <StepSelectAnimation
        rigType="biped"
        selected={[]}
        onSelectionChange={() => {}}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );

    const nextBtn = screen.getByText('Next').closest('button');
    expect(nextBtn?.disabled).toBe(true);
  });

  it('Next button calls onComplete when at least 1 selected', () => {
    render(
      <StepSelectAnimation
        rigType="biped"
        selected={[{ id: 'preset:biped:walk', name: 'Walk' }]}
        onSelectionChange={() => {}}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );

    const nextBtn = screen.getByText('Next').closest('button');
    expect(nextBtn?.disabled).toBe(false);
    fireEvent.click(nextBtn!);
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('shows only 16 v2.5 animations for quadruped', () => {
    render(
      <StepSelectAnimation
        rigType="quadruped"
        selected={[]}
        onSelectionChange={() => {}}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );

    const cards = screen.getAllByRole('button', { name: /preset:/ });
    expect(cards.length).toBe(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/RigWizard/StepSelectAnimation.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement StepSelectAnimation**

Create `src/client/components/RigWizard/StepSelectAnimation.tsx`:

```typescript
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ANIMATION_CATALOG,
  ANIMATION_CATEGORIES,
  getAnimationsForRigType,
  searchAnimations,
  MAX_ANIMATIONS_PER_RIG,
  type AnimationCatalogEntry,
  type AnimationCategory,
} from '../../../shared/animations';
import type { RigType } from '../../../shared/types';

interface SelectedAnim {
  id: string;
  name: string;
}

interface Props {
  rigType: RigType;
  selected: SelectedAnim[];
  onSelectionChange: (next: SelectedAnim[]) => void;
  onComplete: () => void;
  onBack: () => void;
}

const CATEGORY_LABEL_KEYS: Record<AnimationCategory | 'all', string> = {
  'all': 'categoryAll',
  'locomotion': 'categoryLocomotion',
  'dance': 'categoryDance',
  'combat': 'categoryCombat',
  'sports': 'categorySports',
  'emotion': 'categoryEmotion',
  'gesture': 'categoryGesture',
  'idle': 'categoryIdle',
  'special': 'categorySpecial',
  'cross-species': 'categoryCrossSpecies',
};

export function StepSelectAnimation({ rigType, selected, onSelectionChange, onComplete, onBack }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<AnimationCategory | 'all'>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const pool = useMemo(() => getAnimationsForRigType(rigType), [rigType]);

  const filtered = useMemo(() => {
    let result = pool;
    if (activeCategory !== 'all') {
      result = result.filter((e) => e.category === activeCategory);
    }
    if (query.trim()) {
      result = searchAnimations(query, result);
    }
    return result;
  }, [pool, activeCategory, query]);

  const categories = useMemo(() => {
    const present = new Set(pool.map((e) => e.category));
    return ['all', ...ANIMATION_CATEGORIES.filter((c) => present.has(c))] as Array<AnimationCategory | 'all'>;
  }, [pool]);

  const toggleSelect = (entry: AnimationCatalogEntry) => {
    const isSelected = selected.some((s) => s.id === entry.id);
    if (isSelected) {
      onSelectionChange(selected.filter((s) => s.id !== entry.id));
    } else {
      if (selected.length >= MAX_ANIMATIONS_PER_RIG) return;
      onSelectionChange([...selected, { id: entry.id, name: entry.name }]);
    }
  };

  return (
    <div style={styles.container}>
      <input
        ref={searchRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setQuery('');
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && selected.length > 0) onComplete();
        }}
        placeholder={t('searchAnimations')}
        style={styles.search}
      />

      <div style={styles.chips}>
        {categories.map((cat) => {
          const count = cat === 'all' ? pool.length : pool.filter((e) => e.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={isActive ? styles.chipActive : styles.chip}
            >
              {t(CATEGORY_LABEL_KEYS[cat])} ({count})
            </button>
          );
        })}
      </div>

      <div style={styles.grid}>
        {filtered.map((entry) => {
          const isSelected = selected.some((s) => s.id === entry.id);
          return (
            <button
              key={entry.id}
              aria-label={entry.id}
              onClick={() => toggleSelect(entry)}
              style={isSelected ? styles.cardSelected : styles.card}
              title={`${entry.nameZh}${entry.tags?.length ? ' · ' + entry.tags.join(', ') : ''}`}
            >
              <div style={styles.cardName}>{entry.name}</div>
              <div style={styles.cardNameZh}>{entry.nameZh}</div>
              {isSelected && <span style={styles.check}>✓</span>}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={styles.empty}>
            <span style={{ fontSize: 10, color: '#888' }}>—</span>
          </div>
        )}
      </div>

      <div style={styles.footer}>
        <button onClick={onBack} style={styles.secondaryBtn}>{t('backBtn')}</button>
        <span style={styles.count}>
          {t('selectedCount')}: {selected.length}/{MAX_ANIMATIONS_PER_RIG} ({t('maxSelections')})
        </span>
        <button
          onClick={onComplete}
          disabled={selected.length === 0}
          style={selected.length === 0 ? styles.primaryBtnDisabled : styles.primaryBtn}
        >
          {t('nextBtn')} →
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 8, padding: 8, minHeight: 360 },
  search: {
    padding: '6px 8px', fontSize: 11,
    backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: 3,
    color: '#e0e0e0', outline: 'none', width: '100%', boxSizing: 'border-box' as const,
  },
  chips: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
  chip: {
    padding: '3px 8px', fontSize: 9,
    backgroundColor: '#2b2b2b', border: '1px solid #444', borderRadius: 10,
    color: '#999', cursor: 'pointer',
  },
  chipActive: {
    padding: '3px 8px', fontSize: 9,
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 10,
    color: '#4a9eff', cursor: 'pointer', fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 4,
    maxHeight: 260,
    overflowY: 'auto' as const,
    padding: 2,
  },
  card: {
    position: 'relative' as const,
    padding: '6px 4px',
    backgroundColor: '#252525', border: '1px solid #333', borderRadius: 3,
    cursor: 'pointer', textAlign: 'center' as const,
    display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
  },
  cardSelected: {
    position: 'relative' as const,
    padding: '6px 4px',
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 3,
    cursor: 'pointer', textAlign: 'center' as const,
    display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center',
  },
  cardName: {
    fontSize: 9, fontWeight: 600, color: '#e0e0e0',
    whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  cardNameZh: { fontSize: 8, color: '#888' },
  check: {
    position: 'absolute' as const, top: 2, right: 4,
    color: '#4a9eff', fontSize: 10, fontWeight: 700,
  },
  empty: { gridColumn: '1 / -1', textAlign: 'center' as const, padding: 20 },
  footer: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 6, borderTop: '1px solid #333',
  },
  count: { fontSize: 10, color: '#aaa' },
  primaryBtn: {
    padding: '5px 12px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 3,
    color: '#4a9eff', fontWeight: 600,
  },
  primaryBtnDisabled: {
    padding: '5px 12px', fontSize: 10, cursor: 'not-allowed',
    backgroundColor: '#2b2b2b', border: '1px solid #444', borderRadius: 3,
    color: '#666',
  },
  secondaryBtn: {
    padding: '5px 12px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2b2b2b', border: '1px solid #555', borderRadius: 3,
    color: '#ccc',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/RigWizard/StepSelectAnimation.test.tsx`
Expected: PASS (7 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/client/components/RigWizard/StepSelectAnimation.tsx __tests__/components/RigWizard/StepSelectAnimation.test.tsx
git commit -m "feat: Rig Wizard Step 3 (Search-First animation grid)

117-animation grid with category chips, multi-select capped at 5,
keyboard shortcuts (Esc clears search, Cmd+Enter advances). Filters
by rig_type — biped sees all 117, non-biped sees only the 16 v2.5
cross-species animations."
```

---

## Task 8: Step 4 — Execute

**Files:**
- Create: `src/client/components/RigWizard/StepExecute.tsx`

- [ ] **Step 1: Implement Step 4 component**

Create `src/client/components/RigWizard/StepExecute.tsx`:

```typescript
import React, { useEffect, useState, useRef } from 'react';
import { useRigChain } from '../../hooks/useRigChain';
import { useTranslation } from '../../hooks/useTranslation';
import type { ModelRecord, RigType, AnimationExecutionState } from '../../../shared/types';

interface SelectedAnim {
  id: string;
  name: string;
}

interface Props {
  model: ModelRecord;
  rigType: RigType;
  animations: SelectedAnim[];
  onClose: () => void;
}

const STATUS_ICON: Record<AnimationExecutionState['status'], string> = {
  queued: '·',
  rigging: '🦴',
  retargeting: '🎬',
  downloading: '⬇',
  importing: '📥',
  done: '✓',
  failed: '✗',
};

export function StepExecute({ model, rigType, animations, onClose }: Props) {
  const { executeChain } = useRigChain();
  const { t } = useTranslation();
  const [states, setStates] = useState<AnimationExecutionState[]>(
    animations.map((a) => ({ animationId: a.id, animationName: a.name, status: 'queued', progress: 0 })),
  );
  const [chainError, setChainError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        await executeChain({
          modelTaskId: model.taskId,
          rigType,
          animations,
          onProgress: (s) => setStates(s),
        });
      } catch (err: any) {
        setChainError(err.message || String(err));
      }
    })();
  }, [model.taskId, rigType, animations, executeChain]);

  const allDone = states.every((s) => s.status === 'done' || s.status === 'failed');
  const anyFailed = states.some((s) => s.status === 'failed');
  const successCount = states.filter((s) => s.status === 'done').length;

  return (
    <div style={styles.container}>
      <div style={styles.modelName}>{model.name}</div>
      <div style={styles.rows}>
        {states.map((s) => (
          <div key={s.animationId} style={styles.row}>
            <span style={styles.statusIcon}>{STATUS_ICON[s.status]}</span>
            <div style={styles.rowInfo}>
              <div style={styles.rowName}>{s.animationName}</div>
              <div style={styles.rowStatus}>
                {t('status' + s.status.charAt(0).toUpperCase() + s.status.slice(1))}
                {s.error ? ' · ' + s.error : ''}
              </div>
              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressBar,
                    width: `${s.progress}%`,
                    backgroundColor: s.status === 'failed' ? '#ff6b6b' : '#4a9eff',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {chainError && (
        <div style={styles.chainError}>{chainError}</div>
      )}

      {allDone && (
        <div style={styles.summary}>
          {successCount}/{states.length} {t('statusDone').toLowerCase()}
          {anyFailed && ' · ' + states.filter((s) => s.status === 'failed').length + ' ' + t('statusFailed').toLowerCase()}
        </div>
      )}

      <div style={styles.footer}>
        <button
          onClick={onClose}
          disabled={!allDone}
          style={allDone ? styles.primaryBtn : styles.primaryBtnDisabled}
        >
          {t('closeBtn')}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, minHeight: 360 },
  modelName: { fontSize: 11, fontWeight: 600, color: '#e0e0e0' },
  rows: { display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflowY: 'auto' as const },
  row: { display: 'flex', gap: 8, padding: 6, backgroundColor: '#252525', border: '1px solid #333', borderRadius: 3 },
  statusIcon: { fontSize: 14, width: 18, textAlign: 'center' as const },
  rowInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  rowName: { fontSize: 10, fontWeight: 600, color: '#e0e0e0' },
  rowStatus: { fontSize: 9, color: '#888' },
  progressTrack: {
    height: 3, backgroundColor: '#333', borderRadius: 2, marginTop: 2, overflow: 'hidden',
  },
  progressBar: { height: '100%', transition: 'width 0.3s' },
  chainError: {
    padding: '6px 8px', fontSize: 10, color: '#ff6b6b',
    backgroundColor: '#3a1a1a', border: '1px solid #662222', borderRadius: 3,
  },
  summary: {
    padding: '6px 8px', fontSize: 10, color: '#4caf50',
    backgroundColor: '#1b321b', border: '1px solid #2e7d32', borderRadius: 3,
  },
  footer: { display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid #333' },
  primaryBtn: {
    padding: '6px 14px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2a3a4f', border: '1px solid #4a9eff', borderRadius: 3,
    color: '#4a9eff', fontWeight: 600,
  },
  primaryBtnDisabled: {
    padding: '6px 14px', fontSize: 10, cursor: 'not-allowed',
    backgroundColor: '#2b2b2b', border: '1px solid #444', borderRadius: 3,
    color: '#666',
  },
};
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/client/components/RigWizard/StepExecute.tsx
git commit -m "feat: Rig Wizard Step 4 (execute chain visualization)"
```

---

## Task 9: Wizard Modal Shell

**Files:**
- Create: `src/client/components/RigWizard/index.tsx`
- Test: `__tests__/components/RigWizard/index.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/RigWizard/index.test.tsx`:

```typescript
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RigWizard } from '../../../src/client/components/RigWizard';
import { useStore } from '../../../src/client/stores/useStore';
import type { ModelRecord } from '../../../src/shared/types';

jest.mock('../../../src/client/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        rigWizardTitle: 'Rig Wizard',
        rigWizardStep1: 'Step 1',
        rigWizardStep2: 'Step 2',
        rigWizardStep3: 'Step 3',
        rigWizardStep4: 'Step 4',
        cancelBtn: 'Cancel',
        emptyLibrary: 'No models',
        searchAnimations: 'Search...',
        selectedCount: 'Selected',
        maxSelections: 'max',
        nextBtn: 'Next',
        backBtn: 'Back',
        categoryAll: 'All',
        closeBtn: 'Close',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('../../../src/client/hooks/useRigChain', () => ({
  useRigChain: () => ({
    runPrerigCheck: jest.fn().mockResolvedValue({ riggable: true, rigType: 'biped' }),
    executeChain: jest.fn().mockResolvedValue({ rigTaskId: 'rig-001', states: [] }),
  }),
}));

jest.mock('../../../src/client/services/tripoApi', () => ({
  TripoApiService: jest.fn().mockImplementation(() => ({
    getModelUrl: jest.fn(),
  })),
}));

const sampleModel: ModelRecord = {
  id: 'm1', taskId: 't1', name: 'Test Model',
  format: 'GLB', createdAt: Date.now(), pipelineSteps: [],
};

describe('RigWizard', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('starts at Step 1 when no initialModelId', () => {
    render(<RigWizard onClose={() => {}} />);
    expect(screen.getByText('Step 1').parentElement?.textContent).toContain('Step 1');
  });

  it('renders all 4 step labels in header', () => {
    render(<RigWizard onClose={() => {}} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('Step 4')).toBeInTheDocument();
  });

  it('shows Cancel button that calls onClose', () => {
    const onClose = jest.fn();
    render(<RigWizard onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty state when no models and no initialModelId', () => {
    render(<RigWizard onClose={() => {}} />);
    expect(screen.getByText('No models')).toBeInTheDocument();
  });

  it('cancel button in header X also closes', () => {
    const onClose = jest.fn();
    render(<RigWizard onClose={onClose} />);
    const closeX = screen.getByLabelText('close');
    fireEvent.click(closeX);
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/RigWizard/index.test.tsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement the Wizard shell**

Create `src/client/components/RigWizard/index.tsx`:

```typescript
import React, { useState } from 'react';
import { useStore } from '../../stores/useStore';
import { useTranslation } from '../../hooks/useTranslation';
import { StepSelectModel } from './StepSelectModel';
import { StepPreRigCheck } from './StepPreRigCheck';
import { StepSelectAnimation } from './StepSelectAnimation';
import { StepExecute } from './StepExecute';
import type { ModelRecord, RigType, RigCheckResult, RigWizardStep } from '../../../shared/types';

interface SelectedAnim {
  id: string;
  name: string;
}

interface Props {
  initialModelId?: string | null;
  onClose: () => void;
}

export function RigWizard({ initialModelId, onClose }: Props) {
  const { t } = useTranslation();
  const apiKey = useStore((s) => s.apiKey);
  const models = useStore((s) => s.models);

  const [step, setStep] = useState<RigWizardStep>('select-model');
  const [selectedModel, setSelectedModel] = useState<ModelRecord | null>(
    initialModelId ? models.find((m) => m.id === initialModelId || m.taskId === initialModelId) ?? null : null,
  );
  const [rigCheck, setRigCheck] = useState<RigCheckResult | null>(null);
  const [selectedAnims, setSelectedAnims] = useState<SelectedAnim[]>([]);

  // If initialModelId provided and found, skip straight to Step 2
  React.useEffect(() => {
    if (initialModelId && selectedModel && step === 'select-model') {
      setStep('pre-rig-check');
    }
  }, [initialModelId, selectedModel, step]);

  const stepIndex = ['select-model', 'pre-rig-check', 'select-animation', 'execute'].indexOf(step);

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <span style={styles.title}>{t('rigWizardTitle')}</span>
          <button aria-label="close" onClick={onClose} style={styles.closeX}>✕</button>
        </div>

        <div style={styles.steps}>
          {(['select-model', 'pre-rig-check', 'select-animation', 'execute'] as RigWizardStep[]).map((s, i) => {
            const labels = ['rigWizardStep1', 'rigWizardStep2', 'rigWizardStep3', 'rigWizardStep4'];
            const isCurrent = s === step;
            const isDone = i < stepIndex;
            return (
              <div key={s} style={isCurrent ? styles.stepActive : (isDone ? styles.stepDone : styles.step)}>
                <span>{t(labels[i])}</span>
              </div>
            );
          })}
        </div>

        <div style={styles.body}>
          {step === 'select-model' && (
            <StepSelectModel
              apiKey={apiKey}
              selectedModelId={selectedModel?.id ?? null}
              onSelect={(m) => {
                setSelectedModel(m);
                setStep('pre-rig-check');
              }}
            />
          )}

          {step === 'pre-rig-check' && selectedModel && (
            <StepPreRigCheck
              model={selectedModel}
              onComplete={(result) => {
                setRigCheck(result);
                setStep('select-animation');
              }}
              onBack={() => setStep('select-model')}
            />
          )}

          {step === 'select-animation' && rigCheck && (
            <StepSelectAnimation
              rigType={(rigCheck.rigType as RigType) || 'biped'}
              selected={selectedAnims}
              onSelectionChange={setSelectedAnims}
              onComplete={() => setStep('execute')}
              onBack={() => setStep('pre-rig-check')}
            />
          )}

          {step === 'execute' && selectedModel && rigCheck && (
            <StepExecute
              model={selectedModel}
              rigType={rigCheck.rigType}
              animations={selectedAnims}
              onClose={onClose}
            />
          )}
        </div>

        {step !== 'execute' && (
          <div style={styles.footer}>
            <button onClick={onClose} style={styles.cancelBtn}>{t('cancelBtn')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  },
  modal: {
    width: '94%', maxWidth: 560, maxHeight: '90vh',
    backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: 6,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 12px', borderBottom: '1px solid #333', backgroundColor: '#252525',
  },
  title: { fontSize: 11, fontWeight: 600, color: '#e0e0e0' },
  closeX: {
    padding: '2px 8px', fontSize: 11, cursor: 'pointer',
    backgroundColor: 'transparent', border: 'none', color: '#888',
  },
  steps: {
    display: 'flex', gap: 2, padding: '6px 8px',
    borderBottom: '1px solid #333', backgroundColor: '#1a1a1a',
  },
  step: {
    flex: 1, padding: '4px 6px', fontSize: 9, color: '#666',
    textAlign: 'center' as const, borderBottom: '2px solid transparent',
  },
  stepActive: {
    flex: 1, padding: '4px 6px', fontSize: 9, color: '#4a9eff', fontWeight: 600,
    textAlign: 'center' as const, borderBottom: '2px solid #4a9eff',
  },
  stepDone: {
    flex: 1, padding: '4px 6px', fontSize: 9, color: '#4caf50',
    textAlign: 'center' as const, borderBottom: '2px solid #2e7d32',
  },
  body: { flex: 1, overflowY: 'auto' as const },
  footer: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '8px 12px', borderTop: '1px solid #333', backgroundColor: '#252525',
  },
  cancelBtn: {
    padding: '5px 12px', fontSize: 10, cursor: 'pointer',
    backgroundColor: '#2b2b2b', border: '1px solid #555', borderRadius: 3,
    color: '#ccc',
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/RigWizard/index.test.tsx`
Expected: PASS (5 tests passing)

- [ ] **Step 5: Commit**

```bash
git add src/client/components/RigWizard/index.tsx __tests__/components/RigWizard/index.test.tsx
git commit -m "feat: Rig Wizard modal shell (4-step state machine)"
```

---

## Task 10: Library Card "Rig & Animate" Button

**Files:**
- Modify: `src/client/components/LibraryTab/index.tsx`

- [ ] **Step 1: Add RigWizard import and state**

At the top of `src/client/components/LibraryTab/index.tsx`, after the existing imports, add:

```typescript
import { RigWizard } from '../RigWizard';
```

Inside `LibraryTab()` function, after `const [previewModel, setPreviewModel] = useState<ModelRecord | null>(null);` add:

```typescript
const [rigWizardModel, setRigWizardModel] = useState<ModelRecord | null>(null);
```

- [ ] **Step 2: Add the button to model card actions**

Locate the `modelActions` div (around line 401-426 in the original file). Insert a new button right after the preview button and before the reimport button:

```typescript
{model.modelPath && (
  <button
    onClick={() => setRigWizardModel(model)}
    style={styles.rigBtn}
    title={t('rigAnimateCardBtn')}
  >
    🦴
  </button>
)}
```

- [ ] **Step 3: Add the Wizard modal render at the bottom**

After the existing `{previewModel && (<GltfPreviewModal ... />)}` block (around line 550-556), add:

```typescript
{rigWizardModel && (
  <RigWizard
    initialModelId={rigWizardModel.id}
    onClose={() => setRigWizardModel(null)}
  />
)}
```

- [ ] **Step 4: Add the button style**

In the `styles` object, after `previewBtn:` (around line 698-706), add:

```typescript
rigBtn: {
  padding: '3px 6px',
  fontSize: 9,
  backgroundColor: '#3d2a1a',
  border: '1px solid #8a5c2e',
  borderRadius: 3,
  color: '#ffaa50',
  cursor: 'pointer',
},
```

- [ ] **Step 5: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/client/components/LibraryTab/index.tsx
git commit -m "feat: add 'Rig & Animate' button to Library card actions"
```

---

## Task 11: Animation Tab CTA Button

**Files:**
- Modify: `src/client/components/AnimationTab/index.tsx`

- [ ] **Step 1: Add RigWizard import and state**

At the top of `src/client/components/AnimationTab/index.tsx`, after existing imports, add:

```typescript
import { RigWizard } from '../RigWizard';
```

Inside `AnimationTab()` function, after the existing state declarations (around line 183, after `exportingStatus` state), add:

```typescript
const [showRigWizard, setShowRigWizard] = useState<boolean>(false);
```

- [ ] **Step 2: Add CTA button at top of return JSX**

Locate the `return (` statement. Insert a CTA container as the FIRST child of the top-level returned div (before any existing sections). Example:

```typescript
<button
  onClick={() => setShowRigWizard(true)}
  style={styles.rigWizardCTA}
>
  🦴 {t('rigExternalModelBtn')}
</button>
{showRigWizard && (
  <RigWizard onClose={() => setShowRigWizard(false)} />
)}
```

If `styles` is defined as a const at the bottom of this file (matching the LibraryTab pattern), add a new entry:

```typescript
rigWizardCTA: {
  padding: '8px 12px', fontSize: 11, fontWeight: 600,
  backgroundColor: '#3d2a1a', border: '1px solid #8a5c2e', borderRadius: 4,
  color: '#ffaa50', cursor: 'pointer', marginBottom: 8, width: '100%',
  boxSizing: 'border-box' as const,
},
```

If `AnimationTab` uses inline styles instead of a `styles` const, use the inline object directly.

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/client/components/AnimationTab/index.tsx
git commit -m "feat: add 'Rig External Model' CTA at top of Animation tab"
```

---

## Task 12: Full Build Verification

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: All tests pass, including the new ones in Tasks 1, 3, 7, 9.

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds, `dist/` populated, manifest sanitized.

- [ ] **Step 3: Manual smoke test in AE (optional but recommended)**

If you have AE available:
1. Install the ZXP from the build.
2. Open the Tripo4AE panel.
3. Library tab: import an external GLB via "Import External".
4. Click the new "🦴" rig button on the imported card.
5. Confirm Wizard opens at Step 2 (pre-rig check).
6. Wait for check to complete; click Next.
7. In Step 3, search "walk" — verify the grid filters live.
8. Select 1-3 animations; click Next.
9. Step 4: watch the chain run; verify results appear in Library.
10. Open Animation tab; click "🦴 Rig External Model" CTA; confirm Wizard opens at Step 1.

- [ ] **Step 4: Commit any final fixes**

If the manual test surfaced issues, fix them in a follow-up commit. If clean, no commit needed.

---

## Self-Review Notes

**Spec coverage:**
- §3 User Flow (4 steps) → Tasks 5-9 (Steps 1-4 + Wizard shell).
- §5.1 New files → All created (Tasks 1, 3, 5-9).
- §5.2 Modified files → Tasks 10-11 (LibraryTab, AnimationTab), Task 4 (translations), Task 2 (types).
- §6 Animation catalog (117 entries) → Task 1 with full code.
- §7 Search-First UI → Task 7 with search, category chips, multi-select cap.
- §8 Max 5 → `MAX_ANIMATIONS_PER_RIG` constant in Task 1, enforced in Task 7.
- §9 Error handling → Task 3 (`useRigChain` per-animation try/catch), Task 6 (prerigcheck failure UI).
- §10 Testing → Tasks 1, 3, 7, 9 include tests.
- §13 Acceptance criteria → All covered.

**Type consistency:**
- `AnimationExecutionState` defined in Task 2, used in Tasks 3 and 8.
- `RigCheckResult` defined in Task 2, used in Tasks 3 and 6.
- `RigWizardStep` defined in Task 2, used in Task 9.
- `AnimationCatalogEntry`, `AnimationCategory`, `RigVersionLabel` defined in Task 1, used in Tasks 7 and 9.
- `SelectedAnim` interface (id, name) consistent across Tasks 7, 8, 9.

**Placeholder scan:** No TBDs, TODOs, or "implement later". All code is complete. The animations.ts file has the full 117 entries.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-13-external-model-rigging-wizard.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Good for the catalog Task 1 (large file) and Step 3 (complex UI).

**2. Inline Execution** — I execute tasks sequentially in this session with checkpoints. Faster for the small tasks (types, translations).

**Which approach?**
