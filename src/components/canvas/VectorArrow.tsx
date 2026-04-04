import { Arrow, Group, Text } from 'react-konva';
import type { CanvasVector } from '../../types/canvas';

interface Props {
  vector: CanvasVector;
  isSelected: boolean;
  label: string;
  highlightColor: string;
  scale: number;  // Current stage scale — keeps all sizes viewport-invariant
  onSelect: () => void;
}

export function VectorArrow({ vector, isSelected, label, highlightColor, scale, onSelect }: Props) {
  const { startX, startY, endX, endY, color, strokeWidth } = vector;
  const strokeColor = isSelected ? highlightColor : color;

  // All pixel-space values divided by scale so they appear constant on screen
  // regardless of zoom level or image resolution
  const sw = (isSelected ? strokeWidth + 2 : strokeWidth) / scale;
  const pointerLen = (10 + strokeWidth) / scale;
  const pointerWid = (8 + strokeWidth) / scale;
  const glowSW = sw + 6 / scale;
  const hitSW = 14 / scale;

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Label size and offset also viewport-invariant
  const fontSize = (9 + strokeWidth * 2) / scale;
  const labelOffsetX = (4 + strokeWidth) / scale;
  const labelOffsetY = -(fontSize + 3 / scale);

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      {/* Glow ring when selected */}
      {isSelected && (
        <Arrow
          points={[startX, startY, endX, endY]}
          stroke={highlightColor}
          strokeWidth={glowSW}
          fill={highlightColor}
          pointerLength={pointerLen + 4 / scale}
          pointerWidth={pointerWid + 4 / scale}
          opacity={0.25}
          hitStrokeWidth={0}
          listening={false}
        />
      )}
      <Arrow
        points={[startX, startY, endX, endY]}
        stroke={strokeColor}
        strokeWidth={sw}
        fill={strokeColor}
        pointerLength={pointerLen}
        pointerWidth={pointerWid}
        hitStrokeWidth={hitSW}
      />
      {label && (
        <Text
          x={midX + labelOffsetX}
          y={midY + labelOffsetY}
          text={label}
          fontSize={fontSize}
          fill={strokeColor}
          fontStyle={isSelected ? 'bold' : 'normal'}
        />
      )}
    </Group>
  );
}
