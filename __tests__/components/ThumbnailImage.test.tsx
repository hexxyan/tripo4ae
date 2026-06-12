/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThumbnailImage } from '../../src/client/components/common/ThumbnailImage';
import { TripoApiService } from '../../src/client/services/tripoApi';

// Mock fs
const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();
jest.mock('fs', () => ({
  existsSync: (path: string) => mockExistsSync(path),
  readFileSync: (path: string) => mockReadFileSync(path),
}));

// Mock TripoApiService
jest.mock('../../src/client/services/tripoApi', () => {
  return {
    TripoApiService: jest.fn().mockImplementation(() => ({
      getTask: jest.fn().mockResolvedValue({
        task_id: 'task-abc-123',
        status: 'success',
        output: {
          rendered_image: 'https://cdn.example.com/new-render.png',
        },
      }),
      downloadThumbnail: jest.fn().mockResolvedValue('/fake/path/task-abc-123_thumb.png'),
    })),
  };
});

// Setup global cep mock
beforeAll(() => {
  (window as any).cep = {};
  (globalThis as any).require = (moduleName: string) => {
    if (moduleName === 'fs') {
      return {
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
      };
    }
    throw new Error(`Unexpected require: ${moduleName}`);
  };
});

afterAll(() => {
  delete (window as any).cep;
  delete (globalThis as any).require;
});

describe('ThumbnailImage', () => {
  let mockApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue(Buffer.from('fake-image-bytes'));
    mockApi = new TripoApiService('mock-key');
    (TripoApiService as any).getLocalThumbnailPath = jest.fn().mockReturnValue('/fake/path/task-abc-123_thumb.png');
    (TripoApiService as any).getModelSaveDir = jest.fn().mockReturnValue('/fake/save-dir');
  });

  it('renders loading state or loaded image initially', async () => {
    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <ThumbnailImage
          taskId="task-abc-123"
          thumbnailUrl="https://cdn.example.com/render.png"
          api={mockApi}
        />
      );
      container = res.container;
    });

    const img = container!.querySelector('img');
    const loadingText = screen.queryByText('...');
    expect(img || loadingText).toBeInTheDocument();
  });

  it('loads local thumbnail if file exists', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(Buffer.from('fake-local-image'));

    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <ThumbnailImage
          taskId="task-abc-123"
          thumbnailPath="/fake/path/task-abc-123_thumb.png"
          api={mockApi}
        />
      );
      container = res.container;
    });

    const img = container!.querySelector('img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain('data:image/png;base64,');
    expect(img.src).toContain(Buffer.from('fake-local-image').toString('base64'));
  });

  it('falls back to thumbnailUrl if local thumbnail does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    let container: HTMLElement;
    await act(async () => {
      const res = render(
        <ThumbnailImage
          taskId="task-abc-123"
          thumbnailUrl="https://cdn.example.com/render.png"
          api={mockApi}
        />
      );
      container = res.container;
    });

    const img = container!.querySelector('img') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toBe('https://cdn.example.com/render.png');
  });

  it('renders fallbackText if neither local path nor url is provided', async () => {
    await act(async () => {
      render(
        <ThumbnailImage
          taskId="task-abc-123"
          api={mockApi}
          fallbackText="NO_IMAGE"
        />
      );
    });

    expect(screen.getByText('NO_IMAGE')).toBeInTheDocument();
  });
});
