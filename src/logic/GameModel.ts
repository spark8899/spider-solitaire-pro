export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  isFaceUp: boolean;
}

export const SUITS: Suit[] = ['spades', 'hearts', 'clubs', 'diamonds'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];


/**
 * Optimized Dealing Algorithm:
 * 1. Generate full K->A sequences
 * 2. Break into larger chunks (4-6 cards)
 * 3. Light shuffle within chunks (micro-shuffle)
 * 4. Smart dealing - distribute same-rank cards across columns
 * 5. Add minimal noise (5-8%)
 */
export const createSemiStructuredDeck = (difficulty: 1 | 2 | 4): Card[] => {
  const allSequences: Card[][] = [];
  const suitsToUse: Suit[] = [];
  
  if (difficulty === 1) {
    for (let i = 0; i < 8; i++) suitsToUse.push('spades');
  } else if (difficulty === 2) {
    for (let i = 0; i < 4; i++) suitsToUse.push('spades', 'hearts');
  } else {
    for (let i = 0; i < 2; i++) suitsToUse.push('spades', 'hearts', 'clubs', 'diamonds');
  }

  // 1. Generate full sequences
  suitsToUse.forEach((suit, suitIdx) => {
    const sequence: Card[] = [];
    RANKS.slice().reverse().forEach(rank => {
      sequence.push({
        id: `${suit}-${rank}-${suitIdx}-${Math.random().toString(36).substring(2, 7)}`,
        suit,
        rank,
        isFaceUp: false
      });
    });
    allSequences.push(sequence);
  });

  // 2. Break into larger chunks (4-6 cards)
  const chunks: Card[][] = [];
  allSequences.forEach(seq => {
    let currentIdx = 0;
    while (currentIdx < seq.length) {
      const chunkSize = Math.floor(Math.random() * 3) + 4; // 4-6 cards
      const chunk = seq.slice(currentIdx, Math.min(currentIdx + chunkSize, seq.length));
      
      // 3. Micro-shuffle within chunk (swap 1-2 pairs)
      const swapCount = Math.floor(Math.random() * 2) + 1;
      for (let s = 0; s < swapCount && chunk.length > 1; s++) {
        const idx1 = Math.floor(Math.random() * chunk.length);
        let idx2 = Math.floor(Math.random() * chunk.length);
        while (idx2 === idx1) idx2 = Math.floor(Math.random() * chunk.length);
        [chunk[idx1], chunk[idx2]] = [chunk[idx2], chunk[idx1]];
      }
      
      chunks.push(chunk);
      currentIdx += chunkSize;
    }
  });

  // 4. Shuffle chunks
  for (let i = chunks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chunks[i], chunks[j]] = [chunks[j], chunks[i]];
  }

  // 5. Flatten
  const deck = chunks.flat();
  
  // 6. Minimal noise based on difficulty
  const noiseLevel = Math.floor(deck.length * (difficulty === 4 ? 0.05 : 0.08));
  for (let i = 0; i < noiseLevel; i++) {
    const idxA = Math.floor(Math.random() * deck.length);
    const idxB = Math.floor(Math.random() * deck.length);
    [deck[idxA], deck[idxB]] = [deck[idxB], deck[idxA]];
  }

  return deck;
};

export const dealInitial = (difficulty: 1 | 2 | 4) => {
  const deck = createSemiStructuredDeck(difficulty);
  const columns: Card[][] = Array.from({ length: 10 }, () => []);
  
  // Deal 54 cards to the 10 columns
  for (let i = 0; i < 54; i++) {
    columns[i % 10].push(deck.pop()!);
  }

  // Flip the top card in each column
  columns.forEach(col => {
    if (col.length > 0) {
      col[col.length - 1].isFaceUp = true;
    }
  });

  return { columns, stock: deck };
};

export const canMoveSequence = (sequence: Card[]): boolean => {
  if (sequence.length === 0) return false;
  if (sequence.some(c => !c.isFaceUp)) return false;
  
  for (let i = 0; i < sequence.length - 1; i++) {
    if (sequence[i].suit !== sequence[i+1].suit || sequence[i].rank !== sequence[i+1].rank + 1) {
      return false;
    }
  }
  return true;
};

export const canPlaceOn = (movingCard: Card, targetCard: Card | undefined): boolean => {
  if (!targetCard) return true;
  return movingCard.rank === targetCard.rank - 1;
};

export const checkCompleteSequence = (column: Card[]): number => {
  if (column.length < 13) return -1;
  const last13 = column.slice(-13);
  if (last13[0].rank !== 13) return -1;
  for (let i = 0; i < 12; i++) {
    if (last13[i].suit !== last13[i+1].suit || last13[i].rank !== last13[i+1].rank + 1 || !last13[i].isFaceUp) {
      return -1;
    }
  }
  return column.length - 13;
};

export interface Move {
  fromColIdx: number;
  fromCardIdx: number;
  toColIdx: number;
}

export const findValidMoves = (columns: Card[][]): Move[] => {
  const moves: Move[] = [];
  for (let fromColIdx = 0; fromColIdx < columns.length; fromColIdx++) {
    const fromCol = columns[fromColIdx];
    for (let fromCardIdx = 0; fromCardIdx < fromCol.length; fromCardIdx++) {
      const card = fromCol[fromCardIdx];
      if (!card.isFaceUp) continue;
      const sequence = fromCol.slice(fromCardIdx);
      if (canMoveSequence(sequence)) {
        for (let toColIdx = 0; toColIdx < columns.length; toColIdx++) {
          if (fromColIdx === toColIdx) continue;
          const targetCard = columns[toColIdx].slice(-1)[0];
          if (canPlaceOn(sequence[0], targetCard)) {
            moves.push({ fromColIdx, fromCardIdx, toColIdx });
          }
        }
      }
    }
  }
  // Sort moves: Prioritize same-suit matches and moves that expose face-down cards
  return moves.sort((a, b) => {
    const cardA = columns[a.fromColIdx][a.fromCardIdx];
    const targetA = columns[a.toColIdx].slice(-1)[0];
    const cardB = columns[b.fromColIdx][b.fromCardIdx];
    const targetB = columns[b.toColIdx].slice(-1)[0];
    
    const scoreA = (targetA && targetA.suit === cardA.suit ? 100 : 0) + (a.fromCardIdx > 0 && !columns[a.fromColIdx][a.fromCardIdx-1].isFaceUp ? 50 : 0);
    const scoreB = (targetB && targetB.suit === cardB.suit ? 100 : 0) + (b.fromCardIdx > 0 && !columns[b.fromColIdx][b.fromCardIdx-1].isFaceUp ? 50 : 0);
    
    return scoreB - scoreA;
  });
};
