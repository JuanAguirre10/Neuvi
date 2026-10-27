// Generador pseudoaleatorio determinista (mulberry32): la misma semilla produce los mismos datos.

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Número en [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero entre min y max (ambos incluidos). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)]!;
  }

  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((sum, [, w]) => sum + w, 0);
    let r = this.next() * total;
    for (const [value, w] of items) {
      r -= w;
      if (r < 0) return value;
    }
    return items[items.length - 1]![0];
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }

  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle([...items]).slice(0, n);
  }

  digits(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(this.next() * 10);
    return s;
  }
}

/** Ids con forma de cuid (25 caracteres) generados en el cliente: reproducibles y sin ida y vuelta a la BD. */
export function idFactory(seed: number): () => string {
  const rng = new Rng(seed);
  return () => {
    let id = "c";
    while (id.length < 25) id += Math.floor(rng.next() * 36).toString(36);
    return id;
  };
}
