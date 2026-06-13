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
        categoryLocomotion: 'Locomotion',
        categoryDance: 'Dance',
        categoryCombat: 'Combat',
        categorySports: 'Sports',
        categoryEmotion: 'Emotion',
        categoryGesture: 'Gesture',
        categoryIdle: 'Idle',
        categorySpecial: 'Special',
        categoryCrossSpecies: 'Cross-Species',
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

    const danceChip = screen.getByText('Dance (7)', { selector: 'button' });
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

    const nextBtn = screen.getByText(/Next/).closest('button');
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

    const nextBtn = screen.getByText(/Next/).closest('button');
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

  it('toggles selection off when clicking selected card', () => {
    const onSelectionChange = jest.fn();
    render(
      <StepSelectAnimation
        rigType="biped"
        selected={[{ id: 'preset:biped:walk', name: 'Walk' }]}
        onSelectionChange={onSelectionChange}
        onComplete={mockOnComplete}
        onBack={mockOnBack}
      />,
    );

    const walkCard = screen.getByRole('button', { name: 'preset:biped:walk' });
    fireEvent.click(walkCard);

    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });
});
