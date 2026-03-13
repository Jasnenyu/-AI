import { memo, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  useViewport,
  type NodeProps,
} from '@xyflow/react';
import { Video, AlertTriangle, Play, Pause, Film } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  CANVAS_NODE_TYPES,
  DEFAULT_ASPECT_RATIO,
  VIDEO_GENERATION_NODE_MIN_WIDTH,
  VIDEO_GENERATION_NODE_MIN_HEIGHT,
  type VideoGenerationNodeData,
} from '@/features/canvas/domain/canvasNodes';
import { resolveNodeDisplayName } from '@/features/canvas/domain/nodeDisplay';
import { NodeHeader, NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';
import { NodeResizeHandle } from '@/features/canvas/ui/NodeResizeHandle';
import { useCanvasStore } from '@/stores/canvasStore';
import { UiButton } from '@/components/ui/primitives';

// 视频比例选项
const VIDEO_ASPECT_RATIOS = [
  { value: '16:9', label: '16:9', width: 1920, height: 1080 },
  { value: '9:16', label: '9:16', width: 1080, height: 1920 },
  { value: '1:1', label: '1:1', width: 1080, height: 1080 },
  { value: '4:3', label: '4:3', width: 1440, height: 1080 },
  { value: '3:4', label: '3:4', width: 1080, height: 1440 },
] as const;

// 视频生成模型选项（从 Henji-AI 迁移）
const VIDEO_MODELS = [
  // PPIO 模型
  { value: 'ppio/seedance-v3', label: '即梦视频 3.0 (PPIO)', provider: 'ppio' },
  { value: 'ppio/kling-2.5-turbo', label: '可灵 2.5 Turbo (PPIO)', provider: 'ppio' },
  { value: 'ppio/kling-2.6-pro', label: '可灵 2.6 Pro (PPIO)', provider: 'ppio' },
  { value: 'ppio/kling-o1', label: '可灵 O1 (PPIO)', provider: 'ppio' },
  { value: 'ppio/minimax-hailuo-2.3', label: '海螺 2.3 (PPIO)', provider: 'ppio' },
  { value: 'ppio/minimax-hailuo-02', label: '海螺 02 (PPIO)', provider: 'ppio' },
  { value: 'ppio/pixverse', label: 'PixVerse (PPIO)', provider: 'ppio' },
  { value: 'ppio/vidu', label: 'Vidu (PPIO)', provider: 'ppio' },
  { value: 'ppio/wan', label: '万相 (PPIO)', provider: 'ppio' },
  // FAL 模型
  { value: 'fal/sora-2', label: 'Sora 2 (FAL)', provider: 'fal' },
  { value: 'fal/veo-3.1', label: 'Veo 3.1 (FAL)', provider: 'fal' },
  { value: 'fal/seedance', label: '即梦视频 (FAL)', provider: 'fal' },
  { value: 'fal/kling-video-v2.6-pro', label: '可灵 2.6 Pro (FAL)', provider: 'fal' },
  { value: 'fal/kling-video-o1', label: '可灵 O1 (FAL)', provider: 'fal' },
  { value: 'fal/ltx-2', label: 'LTX-2 (FAL)', provider: 'fal' },
  { value: 'fal/minimax-hailuo-2.3', label: '海螺 2.3 (FAL)', provider: 'fal' },
  { value: 'fal/minimax-hailuo-02', label: '海螺 02 (FAL)', provider: 'fal' },
  { value: 'fal/pixverse-v5.5', label: 'PixVerse V5.5 (FAL)', provider: 'fal' },
  { value: 'fal/vidu-q2', label: 'Vidu Q2 (FAL)', provider: 'fal' },
  { value: 'fal/wan-25-preview', label: '万相 2.5 (FAL)', provider: 'fal' },
  // KIE 模型
  { value: 'kie/seedance-v3', label: '即梦视频 3.0 (KIE)', provider: 'kie' },
  { value: 'kie/kling-v2-6', label: '可灵 2.6 (KIE)', provider: 'kie' },
  { value: 'kie/hailuo-2-3', label: '海螺 2.3 (KIE)', provider: 'kie' },
  { value: 'kie/hailuo-02', label: '海螺 02 (KIE)', provider: 'kie' },
  { value: 'kie/sora2', label: 'Sora 2 (KIE)', provider: 'kie' },
  { value: 'kie/grok-imagine-video', label: 'Grok 视频 (KIE)', provider: 'kie' },
] as const;

type VideoGenerationNodeProps = NodeProps & {
  id: string;
  data: VideoGenerationNodeData;
  selected?: boolean;
};

function resolveNodeDimension(value: number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 1) {
    return Math.round(value);
  }
  return fallback;
}

export const VideoGenerationNode = memo(({ id, data, selected, width, height }: VideoGenerationNodeProps) => {
  const { t } = useTranslation();
  const updateNodeInternals = useUpdateNodeInternals();
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const { zoom } = useViewport();
  const [now, setNow] = useState(() => Date.now());
  
  const isGenerating = typeof data.isGenerating === 'boolean' ? data.isGenerating : false;
  const generationError = typeof data.generationError === 'string' ? data.generationError.trim() : '';
  const hasGenerationError = !isGenerating && !data.videoUrl && generationError.length > 0;
  const generationStartedAt = typeof data.generationStartedAt === 'number' ? data.generationStartedAt : null;
  const generationDurationMs = typeof data.generationDurationMs === 'number' ? data.generationDurationMs : 120000;
  const resolvedAspectRatio = data.aspectRatio || DEFAULT_ASPECT_RATIO;
  
  // 计算节点尺寸
  const aspectRatioParts = resolvedAspectRatio.split(':').map(Number);
  const aspectWidth = aspectRatioParts[0] || 16;
  const aspectHeight = aspectRatioParts[1] || 9;
  const aspect = aspectWidth / aspectHeight;
  
  const defaultWidth = VIDEO_GENERATION_NODE_MIN_WIDTH;
  const defaultHeight = Math.round(defaultWidth / aspect);
  
  const resolvedWidth = resolveNodeDimension(width, defaultWidth);
  const resolvedHeight = resolveNodeDimension(height, Math.max(defaultHeight, VIDEO_GENERATION_NODE_MIN_HEIGHT));
  
  const resolvedTitle = useMemo(
    () => resolveNodeDisplayName(CANVAS_NODE_TYPES.videoGeneration, data),
    [data]
  );

  // 更新节点内部状态
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, resolvedHeight, resolvedWidth, updateNodeInternals]);

  // 生成进度动画
  useEffect(() => {
    if (!isGenerating) {
      return;
    }
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 120);
    return () => {
      window.clearInterval(timer);
    };
  }, [isGenerating]);

  // 模拟进度
  const simulatedProgress = useMemo(() => {
    if (!isGenerating) {
      return 0;
    }
    const startedAt = generationStartedAt ?? Date.now();
    const duration = Math.max(1000, generationDurationMs);
    const elapsed = Math.max(0, now - startedAt);
    return Math.min(elapsed / duration, 0.96);
  }, [generationDurationMs, generationStartedAt, isGenerating, now]);

  // 处理模型选择
  const handleModelChange = useCallback((model: string) => {
    updateNodeData(id, { model });
  }, [id, updateNodeData]);

  // 处理比例选择
  const handleAspectRatioChange = useCallback((aspectRatio: string) => {
    updateNodeData(id, { aspectRatio });
  }, [id, updateNodeData]);

  // 处理提示词变化
  const handlePromptChange = useCallback((prompt: string) => {
    updateNodeData(id, { prompt });
  }, [id, updateNodeData]);

  // 开始生成视频
  const handleGenerate = useCallback(() => {
    // TODO: 集成 Henji-AI 的适配器进行视频生成
    updateNodeData(id, {
      isGenerating: true,
      generationStartedAt: Date.now(),
      generationError: '',
    });
  }, [id, updateNodeData]);

  // 获取当前模型信息
  const currentModel = VIDEO_MODELS.find(m => m.value === data.model) || VIDEO_MODELS[0];

  return (
    <div
      className={`
        group relative overflow-visible rounded-[var(--node-radius)] border bg-surface-dark/85 p-0 transition-colors duration-150
        ${hasGenerationError
          ? (selected
            ? 'border-red-400 shadow-[0_0_0_1px_rgba(248,113,113,0.42)]'
            : 'border-red-500/70 bg-[rgba(127,29,29,0.12)] hover:border-red-400/80 dark:border-red-500/70 dark:hover:border-red-400/80')
          : selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(15,23,42,0.22)] hover:border-[rgba(15,23,42,0.34)] dark:border-[rgba(255,255,255,0.22)] dark:hover:border-[rgba(255,255,255,0.34)]'}
      `}
      style={{ width: resolvedWidth, height: resolvedHeight }}
      onClick={() => setSelectedNode(id)}
    >
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<Video className="h-4 w-4" />}
        titleText={resolvedTitle}
        titleClassName="inline-block max-w-[180px] truncate whitespace-nowrap align-bottom"
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      <div
        className={`relative h-full w-full overflow-hidden rounded-[var(--node-radius)] ${hasGenerationError ? 'bg-[rgba(127,29,29,0.2)]' : 'bg-bg-dark'}`}
      >
        {data.videoUrl ? (
          // 视频预览
          <div className="relative h-full w-full">
            <video
              src={data.videoUrl}
              className="h-full w-full object-contain"
              controls
              loop
              muted
            />
          </div>
        ) : hasGenerationError ? (
          // 错误状态
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-red-300">
            <AlertTriangle className="h-7 w-7 opacity-90" />
            <span className="text-center text-[12px] font-medium leading-5 text-red-200">
              {t('node.videoNode.generationFailed')}
            </span>
            <span className="max-h-[88px] overflow-y-auto break-words text-center text-[11px] leading-5 text-red-200/90">
              {generationError}
            </span>
          </div>
        ) : isGenerating ? (
          // 生成中状态
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-text-muted/85">
            <div className="relative">
              <Film className="h-10 w-10 opacity-60 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-medium">
                  {Math.round(simulatedProgress * 100)}%
                </span>
              </div>
            </div>
            <span className="px-4 text-center text-[12px] leading-6">
              {t('node.videoNode.generating')}
            </span>
            <div className="w-3/4 h-1.5 bg-bg-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-[width] duration-100 ease-linear"
                style={{ width: `${simulatedProgress * 100}%` }}
              />
            </div>
          </div>
        ) : (
          // 编辑状态
          <div className="flex h-full w-full flex-col p-3 gap-2 overflow-y-auto">
            {/* 提示词输入 */}
            <textarea
              value={data.prompt || ''}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder={t('node.videoNode.promptPlaceholder')}
              className="w-full flex-1 min-h-[60px] resize-none rounded border border-border-dark bg-surface-dark px-2 py-1.5 text-xs text-text-dark placeholder:text-text-muted/60 focus:border-accent focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 模型选择 */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-text-muted uppercase tracking-wider">
                {t('node.videoNode.model')}
              </label>
              <select
                value={data.model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full rounded border border-border-dark bg-surface-dark px-2 py-1 text-xs text-text-dark focus:border-accent focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                {VIDEO_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 比例选择 */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-text-muted uppercase tracking-wider">
                {t('node.videoNode.aspectRatio')}
              </label>
              <div className="flex flex-wrap gap-1">
                {VIDEO_ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAspectRatioChange(ratio.value);
                    }}
                    className={`
                      px-2 py-1 rounded text-[10px] font-medium transition-colors
                      ${data.aspectRatio === ratio.value
                        ? 'bg-accent text-white'
                        : 'bg-surface-dark text-text-muted hover:bg-bg-dark hover:text-text-dark border border-border-dark'}
                    `}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 生成按钮 */}
            <UiButton
              onClick={handleGenerate}
              disabled={!data.prompt?.trim()}
              className="w-full mt-auto py-1.5 text-xs"
            >
              <Play className="h-3 w-3 mr-1" />
              {t('node.videoNode.generate')}
            </UiButton>
          </div>
        )}
      </div>

      {/* 输入/输出连接点 */}
      <Handle
        type="target"
        id="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      <Handle
        type="source"
        id="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-surface-dark !bg-accent"
      />
      
      <NodeResizeHandle
        minWidth={VIDEO_GENERATION_NODE_MIN_WIDTH}
        minHeight={VIDEO_GENERATION_NODE_MIN_HEIGHT}
        maxWidth={1600}
        maxHeight={1600}
      />
    </div>
  );
});

VideoGenerationNode.displayName = 'VideoGenerationNode';
