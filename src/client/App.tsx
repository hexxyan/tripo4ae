import React, { useState } from 'react';
import { Header } from './components/Header';
import { PipelineStepper } from './components/PipelineStepper';
import { GenerateTab } from './components/GenerateTab';
import { RefineTextureTab } from './components/RefineTextureTab';
import { AnimationTab } from './components/AnimationTab';
import { TransformTab } from './components/TransformTab';
import { LibraryTab } from './components/LibraryTab';
import { useStore } from './stores/useStore';

export type TabId = 'generate' | 'refine' | 'animate' | 'transform' | 'library';

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: 'generate', label: 'Generate' },
  { id: 'refine', label: 'Refine' },
  { id: 'animate', label: 'Animate' },
  { id: 'transform', label: 'Transform' },
  { id: 'library', label: 'Library' },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generate');
  const pipeline = useStore((s) => s.pipeline);

  const handleStepClick = (index: number) => {
    const step = pipeline[index];
    if (!step) return;

    const type = step.type;
    if (
      type === 'text_to_model' ||
      type === 'image_to_model' ||
      type === 'multiview_to_model' ||
      type === 'generate_image' ||
      type === 'text_to_image' ||
      type === 'generate_multiview_image' ||
      type === 'edit_multiview_image'
    ) {
      setActiveTab('generate');
    } else if (
      type === 'refine_model' ||
      type === 'texture_model'
    ) {
      setActiveTab('refine');
    } else if (
      type === 'animate_prerigcheck' ||
      type === 'animate_rig' ||
      type === 'animate_retarget'
    ) {
      setActiveTab('animate');
    } else if (
      type === 'convert_model' ||
      type === 'stylize_model'
    ) {
      setActiveTab('transform');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'generate':
        return <GenerateTab />;
      case 'refine':
        return <RefineTextureTab />;
      case 'animate':
        return <AnimationTab />;
      case 'transform':
        return <TransformTab />;
      case 'library':
        return <LibraryTab />;
      default:
        return null;
    }
  };

  return (
    <div style={styles.root}>
      <Header />
      <PipelineStepper pipeline={pipeline} onStepClick={handleStepClick} />
      <div style={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? styles.tabActive : styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={styles.tabContent}>{renderTabContent()}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1e1e',
    color: '#e0e0e0',
    fontFamily:
      "'Segoe UI', 'Adobe Clean', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 11,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #333',
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: '6px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#999',
    fontSize: 11,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  },
  tabActive: {
    flex: 1,
    padding: '6px 0',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#4a9eff',
    fontSize: 11,
    cursor: 'pointer',
    borderBottom: '2px solid #4a9eff',
    fontWeight: 600,
  },
  tabContent: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
};
