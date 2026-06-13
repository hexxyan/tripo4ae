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
