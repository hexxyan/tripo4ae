/**
 * expressions.ts — ExtendScript host module
 * Provides AE expression strings for loop animations: spin, float, breathe.
 */

export type ExpressionType = 'spin' | 'float' | 'breathe';

interface ExpressionParams {
  axis?: 'x' | 'y' | 'z';
  speed?: number;
  amplitude?: number;
  frequency?: number;
}

export function getExpression(type: ExpressionType, params: ExpressionParams = {}): string {
  const axis = params.axis || 'y';
  const speed = params.speed || 1;
  const amplitude = params.amplitude || 50;
  const frequency = params.frequency || 1;

  switch (type) {
    case 'spin':
      return getSpinExpression(axis, speed);
    case 'float':
      return getFloatExpression(axis, amplitude, frequency);
    case 'breathe':
      return getBreatheExpression(amplitude, frequency);
    default:
      return '';
  }
}

function getSpinExpression(axis: string, speed: number): string {
  // Rotation expression — continuous spin
  const axisProp = axis === 'x' ? 'X Rotation' : axis === 'y' ? 'Y Rotation' : 'Z Rotation';
  return [
    '// Tripo4AE Spin Expression',
    'var spd = ' + speed + ';',
    axisProp + ' = time * spd * 360;',
  ].join('\n');
}

function getFloatExpression(axis: string, amplitude: number, frequency: number): string {
  // Position offset expression — sinusoidal float
  const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  return [
    '// Tripo4AE Float Expression',
    'var amp = ' + amplitude + ';',
    'var freq = ' + frequency + ';',
    'var offset = amp * Math.sin(time * freq * 2 * Math.PI);',
    'var pos = value;',
    'pos[' + axisIndex + '] += offset;',
    'pos;',
  ].join('\n');
}

function getBreatheExpression(amplitude: number, frequency: number): string {
  // Scale expression — pulsing breathe
  return [
    '// Tripo4AE Breathe Expression',
    'var amp = ' + amplitude / 100 + ';',  // amplitude as percentage (e.g. 5 -> 0.05)
    'var freq = ' + frequency + ';',
    'var s = 1 + amp * Math.sin(time * freq * 2 * Math.PI);',
    '[value[0] * s, value[1] * s];',
  ].join('\n');
}
