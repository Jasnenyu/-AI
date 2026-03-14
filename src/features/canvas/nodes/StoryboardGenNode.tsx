import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCanvasStore } from '@/stores/canvasStore';
import { CanvasNodeImage } from '@/features/canvas/ui/CanvasNodeImage';
import { NodeHeader } from '@/features/canvas/ui/NodeHeader';
import { NodePriceBadge } from '@/features/canvas/ui/NodePriceBadge';
// import { useStoryboardPrice } from '@/features/canvas/pricing/useStoryboardPrice';
// import { useSettingsStore } from '@/stores/settingsStore';
import { listImageModels, getImageModel } from '@/features/canvas/models';
import { resolveImageDisplayUrl } from '@/utils/imageUrl';
import type { StoryboardGenNodeData, ImageSize } from '@/features/canvas/domain/canvasNodes';
import { 
  STORYBOARD_GEN_HEADER_ADJUST, 
  STORYBOARD_GEN_ICON_ADJUST, 
  STORYBOARD_GEN_TITLE_ADJUST 
} from '@/features/canvas/domain/canvasNodes';
import { NODE_HEADER_FLOATING_POSITION_CLASS } from '@/features/canvas/ui/NodeHeader';

// 避开 React Flow 严格的类型检查
interface StoryboardGenNodeProps {
  id: string;
  data: any;
  selected?: boolean;
}

export function StoryboardGenNode({ id, data, selected }: StoryboardGenNodeProps) {
  const { t } = useTranslation();
  const updateNodeData = useCanvasStore((state) => state.updateNodeData);
  const setSelectedNode = useCanvasStore((state) => state.setSelectedNode);

  const nodeData = data as StoryboardGenNodeData;
  const [frameDescriptionDrafts, setFrameDescriptionDrafts] = useState<Record<string, string>>(() => {
    const drafts: Record<string, string> = {};
    nodeData.frames.forEach((frame) => {
      drafts[frame.id] = frame.description ?? '';
    });
    return drafts;
  });

  const [batchInputText, setBatchInputText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const frameTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const frameHighlightRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const imageModels = useMemo(() => listImageModels(), []);
  const selectedModel = useMemo(() => {
    return getImageModel(nodeData.model) ?? imageModels[0];
  }, [nodeData.model, imageModels]);

  const aspectRatioOptions = useMemo(() => selectedModel?.aspectRatios ?? [], [selectedModel]);
  const selectedAspectRatio = useMemo(() => {
    return aspectRatioOptions.find((r) => r.value === nodeData.requestAspectRatio) ?? aspectRatioOptions[0];
  }, [aspectRatioOptions, nodeData.requestAspectRatio]);

  const resolutionOptions = useMemo(() => selectedModel?.resolutions ?? [], [selectedModel]);
  const selectedResolution = useMemo(() => {
    return resolutionOptions.find((r) => r.value === nodeData.size) ?? resolutionOptions[0];
  }, [resolutionOptions, nodeData.size]);

  // const { priceDisplay: resolvedPriceDisplay, tooltip: resolvedPriceTooltip } = useStoryboardPrice(
  //   nodeData.model,
  //   nodeData.gridRows * nodeData.gridCols
  // );
  const resolvedPriceDisplay = null;
  const resolvedPriceTooltip = '';

  const resolvedTitle = nodeData.displayName || t('node.storyboardGen.title') || '分镜生成';

  const handleRowChange = useCallback((delta: number) => {
    const newRows = Math.max(1, Math.min(4, nodeData.gridRows + delta));
    if (newRows !== nodeData.gridRows) {
      updateNodeData(id, { gridRows: newRows });
    }
  }, [id, nodeData.gridRows, updateNodeData]);

  const handleColChange = useCallback((delta: number) => {
    const newCols = Math.max(1, Math.min(4, nodeData.gridCols + delta));
    if (newCols !== nodeData.gridCols) {
      updateNodeData(id, { gridCols: newCols });
    }
  }, [id, nodeData.gridCols, updateNodeData]);

  const handleFrameDescriptionChange = useCallback((index: number, value: string) => {
    const frame = nodeData.frames[index];
    if (frame) {
      setFrameDescriptionDrafts((prev) => ({ ...prev, [frame.id]: value }));
    }
  }, [nodeData.frames]);

  const handleBatchInputApply = useCallback(() => {
    const lines = batchInputText.split('\n').filter((line) => line.trim());
    const totalFrames = nodeData.gridRows * nodeData.gridCols;
    const newDrafts: Record<string, string> = { ...frameDescriptionDrafts };

    lines.slice(0, totalFrames).forEach((line, index) => {
      const frame = nodeData.frames[index];
      if (frame) {
        const cleanLine = line.replace(/^分镜\d+[:：]\s*/, '').trim();
        newDrafts[frame.id] = cleanLine;
      }
    });

    setFrameDescriptionDrafts(newDrafts);
    setBatchInputText('');
  }, [batchInputText, frameDescriptionDrafts, nodeData.frames, nodeData.gridRows, nodeData.gridCols]);

  const handleGenerate = useCallback(async () => {
    setError(null);
    // TODO: Implement actual generation logic
    console.log('Generating storyboard...');
  }, []);

  const totalFrames = nodeData.gridRows * nodeData.gridCols;

  // Calculate grid layout
  const frameLayout = useMemo(() => {
    const containerWidth = 280;
    const gap = 4;
    const cellWidth = (containerWidth - gap * (nodeData.gridCols - 1)) / nodeData.gridCols;
    // Parse aspect ratio from value (e.g., "16:9" -> 16/9)
    const ratioParts = selectedAspectRatio?.value?.split(':') ?? ['1', '1'];
    const ratioWidth = parseInt(ratioParts[0] ?? '1', 10) || 1;
    const ratioHeight = parseInt(ratioParts[1] ?? '1', 10) || 1;
    const cellHeight = cellWidth * ratioHeight / ratioWidth;
    const gridHeight = cellHeight * nodeData.gridRows + gap * (nodeData.gridRows - 1);
    return {
      gridWidth: containerWidth,
      gridHeight,
      cellWidth,
      cellHeight,
      cellAspectRatio: `${ratioWidth}/${ratioHeight}`,
    };
  }, [nodeData.gridRows, nodeData.gridCols, selectedAspectRatio]);

  if (!nodeData) {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className={`
        group relative flex h-full flex-col overflow-visible rounded-2xl border bg-surface-dark/95 transition-colors duration-150
        ${selected
          ? 'border-accent shadow-[0_0_0_1px_rgba(59,130,246,0.32)]'
          : 'border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)]'}
      `}
      style={{
        width: 320,
        height: 480,
      }}
      onClick={() => setSelectedNode(id)}
    >
      {/* Header */}
      <NodeHeader
        className={NODE_HEADER_FLOATING_POSITION_CLASS}
        icon={<Sparkles className="h-4 w-4" />}
        titleText={resolvedTitle}
        headerAdjust={STORYBOARD_GEN_HEADER_ADJUST}
        iconAdjust={STORYBOARD_GEN_ICON_ADJUST}
        titleAdjust={STORYBOARD_GEN_TITLE_ADJUST}
        rightSlot={
          resolvedPriceDisplay ? (
            <NodePriceBadge
              label={resolvedPriceDisplay.label}
              title={resolvedPriceTooltip}
            />
          ) : undefined
        }
        editable
        onTitleChange={(nextTitle) => updateNodeData(id, { displayName: nextTitle })}
      />

      {/* Top Section: Grid Preview */}
      <div className="flex-1 flex flex-col p-4 pb-2">
        {/* Grid Controls */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-bg-dark text-text-muted hover:text-text-dark border border-border-dark text-xs transition-colors"
              onClick={(e) => { e.stopPropagation(); handleRowChange(-1); }}
            >
              -
            </button>
            <span className="text-xs text-text-dark w-4 text-center">{nodeData.gridRows}</span>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-bg-dark text-text-muted hover:text-text-dark border border-border-dark text-xs transition-colors"
              onClick={(e) => { e.stopPropagation(); handleRowChange(1); }}
            >
              +
            </button>
            <span className="text-text-muted text-xs mx-1">×</span>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-bg-dark text-text-muted hover:text-text-dark border border-border-dark text-xs transition-colors"
              onClick={(e) => { e.stopPropagation(); handleColChange(-1); }}
            >
              -
            </button>
            <span className="text-xs text-text-dark w-4 text-center">{nodeData.gridCols}</span>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-bg-dark text-text-muted hover:text-text-dark border border-border-dark text-xs transition-colors"
              onClick={(e) => { e.stopPropagation(); handleColChange(1); }}
            >
              +
            </button>
          </div>
          <span className="text-[10px] text-text-muted">{totalFrames}格</span>
        </div>

        {/* Grid Preview Area */}
        <div className="flex-1 flex items-center justify-center bg-bg-dark/40 rounded-xl border border-border-dark/50 min-h-0 overflow-hidden">
          <div
            className="grid gap-1"
            style={{
              width: `${frameLayout.gridWidth}px`,
              gridTemplateColumns: `repeat(${nodeData.gridCols}, ${frameLayout.cellWidth}px)`,
            }}
          >
            {nodeData.frames.map((frame, index) => {
              const frameDescription = frameDescriptionDrafts[frame.id] ?? '';
              return (
                <div
                  key={frame.id}
                  className="relative overflow-hidden rounded-lg border border-[rgba(255,255,255,0.08)] bg-bg-dark/60"
                  style={{ aspectRatio: frameLayout.cellAspectRatio }}
                >
                  <textarea
                    ref={(element) => {
                      frameTextareaRefs.current[frame.id] = element;
                    }}
                    value={frameDescription}
                    onChange={(event) => {
                      handleFrameDescriptionChange(index, event.target.value);
                    }}
                    placeholder={`${index + 1}`}
                    className="h-full w-full resize-none overflow-hidden bg-transparent px-2 py-1.5 text-[10px] leading-tight text-text-dark placeholder:text-text-muted/30 focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Prompt Input & Controls */}
      <div className="flex flex-col gap-3 p-4 pt-2">
        {/* Prompt Input */}
        <div className="relative">
          <textarea
            value={batchInputText}
            onChange={(e) => setBatchInputText(e.target.value)}
            placeholder={`输入分镜描述，每行一个，共${totalFrames}个`}
            className="w-full h-20 rounded-xl border border-border-dark bg-bg-dark/50 px-3 py-2.5 text-xs text-text-dark placeholder:text-text-muted/40 focus:border-accent focus:outline-none resize-none"
            onClick={(e) => e.stopPropagation()}
          />
          {batchInputText && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleBatchInputApply(); }}
              className="absolute right-2 bottom-2 px-2.5 py-1 rounded-lg bg-accent text-white text-[10px] hover:bg-accent/90 transition-colors"
            >
              应用
            </button>
          )}
        </div>

        {error && <div className="text-[10px] text-red-400">{error}</div>}

        {/* Control Bar */}
        <div className="flex items-center gap-2">
          {/* Model Select */}
          <select
            value={selectedModel?.id}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
            className="h-8 px-2.5 rounded-lg border border-border-dark bg-bg-dark/50 text-[11px] text-text-dark focus:border-accent focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            {imageModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>

          {/* Aspect Ratio Buttons */}
          <div className="flex items-center gap-1">
            {aspectRatioOptions.slice(0, 3).map((ratio) => (
              <button
                key={ratio.value}
                onClick={(e) => {
                  e.stopPropagation();
                  updateNodeData(id, { requestAspectRatio: ratio.value });
                }}
                className={`
                  h-8 px-2 rounded-lg text-[10px] font-medium transition-colors border
                  ${selectedAspectRatio?.value === ratio.value
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-dark/50 text-text-muted hover:text-text-dark border-border-dark'}
                `}
              >
                {ratio.label}
              </button>
            ))}
          </div>

          {/* Resolution Buttons */}
          <div className="flex items-center gap-1">
            {resolutionOptions.slice(0, 2).map((res) => (
              <button
                key={res.value}
                onClick={(e) => {
                  e.stopPropagation();
                  updateNodeData(id, { size: res.value as ImageSize });
                }}
                className={`
                  h-8 px-2 rounded-lg text-[10px] font-medium transition-colors border
                  ${selectedResolution?.value === res.value
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-dark/50 text-text-muted hover:text-text-dark border-border-dark'}
                `}
              >
                {res.label}
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            onClick={(event) => {
              event.stopPropagation();
              void handleGenerate();
            }}
            className="h-8 px-3 rounded-lg bg-accent text-white text-[11px] font-medium hover:bg-accent/90 transition-colors flex items-center gap-1.5 ml-auto"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            生成
          </button>
        </div>
      </div>

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
    </div>
  );
}
