import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { labelText, plainMath, quantityTex, splitMath, symTex, unitTex } from './tex';

const ok = (src: string) => expect(() => katex.renderToString(src, { throwOnError: true })).not.toThrow();

describe('Formelsatz', () => {
  it('setzt Formelzeichen der Simulationen', () => {
    expect(symTex('v_0')).toBe('v_{0}');
    expect(symTex('E_kin')).toBe('E_{\\mathrm{kin}}');
    expect(symTex('v_y(t)')).toBe('v_{y}(t)');
    expect(symTex('λ')).toBe('\\lambda');
    expect(symTex('T_½')).toBe('T_{1/2}');
  });

  it('setzt Einheiten aufrecht, auch mit Wurzel und Potenz', () => {
    for (const u of ['m/s²', 'pm·√kV', '10⁶ m/s', '°C', 'kΩ', '%', 'µm', 'kg·m/s']) ok(unitTex(u));
    expect(unitTex('pm·√kV')).toBe('\\mathrm{pm\\cdot \\sqrt{kV}}');
    expect(unitTex('m/s²')).toBe('\\mathrm{m/s^{2}}');
  });

  it('schreibt Zahlen deutsch', () => {
    expect(quantityTex(0.5, 2, 'kg')).toBe('0{,}50\\,\\mathrm{kg}');
    expect(quantityTex(null, 2, 'kg')).toBe('\\text{–}\\,\\mathrm{kg}');
  });

  it('trennt Text und Formeln', () => {
    expect(splitMath('Für $L = 1$ gilt')).toEqual([
      { text: 'Für ', math: false },
      { text: 'L = 1', math: true },
      { text: ' gilt', math: false }
    ]);
    expect(plainMath('$E_{\\mathrm{kin}} = \\frac{1}{2}$')).toBe('E_kin = 1/2');
  });

  it('setzt kurze Spaltenbeschriftungen als Formel', () => {
    expect(labelText('v_0')).toBe('$v_{0}$');
    expect(labelText('Masse')).toBe('Masse');
    expect(labelText('$T^2$')).toBe('$T^2$');
  });
});
