import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, HelpCircle, Trophy, Play, Languages } from 'lucide-react';
import './App.css';
import type { Card, Move } from './logic/GameModel';
import { translations } from './logic/translations';
import type { Language } from './logic/translations';
import { 
  dealInitial, 
  canMoveSequence, 
  canPlaceOn, 
  checkCompleteSequence,
  findValidMoves
} from './logic/GameModel';

const SUIT_ICONS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦'
};

const RANK_LABELS: Record<number, string> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K'
};

const formatRank = (rank: number) => RANK_LABELS[rank] || rank.toString();

const PipPattern: React.FC<{ rank: number, suit: string }> = ({ suit }) => (
  <div className="center-suit-large">{SUIT_ICONS[suit]}</div>
);

const CardComponent: React.FC<{
  card: Card;
  cardIdx: number;
  colIdx: number;
  isSelected: boolean;
  isHintSource: boolean;
  isMovable: boolean;
  isInvalid: boolean;
  animAction: string;
  onDragStart: () => void;
  onDragEnd: (info: any) => void;
  onDrag: (info: any) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}> = ({ card, cardIdx, colIdx, isSelected, isHintSource, isMovable, isInvalid, animAction, onDragStart, onDragEnd, onDrag, onClick, onDoubleClick, children }) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  
  return (
    <motion.div 
      layoutId={card.id}
      className={`card-container ${isSelected ? 'selected' : ''} ${isHintSource ? 'hint-source' : ''} ${isInvalid ? 'invalid-move' : ''}`}
      drag={isMovable}
      dragSnapToOrigin
      dragElastic={0.1}
      onDragStart={onDragStart}
      onDragEnd={(_, info) => onDragEnd(info)}
      onDrag={(_, info) => onDrag(info)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      initial={animAction === 'deal' || animAction === 'init' ? { opacity: 0, x: 300, y: 300, rotate: 20 } : { opacity: 1 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        y: 0,
        rotate: 0,
        top: cardIdx === 0 ? 0 : 'var(--card-overlap)',
        zIndex: isSelected ? 15000 + cardIdx : (animAction === 'deal' ? 5000 + cardIdx : cardIdx),
        transition: { 
          layout: { type: 'spring', stiffness: 600, damping: 40 },
          default: { 
            type: 'spring',
            stiffness: animAction === 'deal' ? 200 : (animAction === 'complete' ? 20 : 600),
            damping: animAction === 'deal' ? 25 : (animAction === 'complete' ? 12 : 40),
            delay: animAction === 'deal' ? colIdx * 0.05 : (animAction === 'complete' ? (card.rank - 1) * 0.6 : 0)
          }
        }
      }}
      style={{ position: 'absolute', width: 'var(--card-width)', height: 'var(--card-height)' }}
    >
      <div className="card-inner" style={{ transform: card.isFaceUp ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
        <div className="card-face card-front">
          {card.isFaceUp && (
            <div className={`card-content ${isRed ? 'red' : 'black'}`}>
              <div className="corner-info top-left">
                <span className="rank-text">{formatRank(card.rank)}</span>
                <span className="suit-mini">{SUIT_ICONS[card.suit]}</span>
              </div>
              <PipPattern rank={card.rank} suit={card.suit} />
              <div className="corner-info bottom-right">
                <span className="rank-text">{formatRank(card.rank)}</span>
                <span className="suit-mini">{SUIT_ICONS[card.suit]}</span>
              </div>
            </div>
          )}
        </div>
        <div className="card-face card-back"></div>
      </div>
      {children}
    </motion.div>
  );
};

interface Snapshot {
  columns: Card[][];
  stock: Card[];
  completedPiles: Card[][];
  moveCount: number;
  time: number;
}

const App: React.FC = () => {
  const [columns, setColumns] = useState<Card[][]>([]);
  const [stock, setStock] = useState<Card[]>([]);
  const [completedPiles, setCompletedPiles] = useState<Card[][]>([]);
  const [difficulty, setDifficulty] = useState<1 | 2 | 4>(1);
  const [selectedCards, setSelectedCards] = useState<{ colIdx: number, cardIdx: number } | null>(null);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [time, setTime] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [hint, setHint] = useState<Move | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [animAction, setAnimAction] = useState<'deal' | 'move' | 'init' | 'undo' | 'complete'>('init');
  const [dragTargetCol, setDragTargetCol] = useState<number | null>(null);
  const [invalidMove, setInvalidMove] = useState<boolean>(false);
  const [lang, setLang] = useState<Language>(
    navigator.language.startsWith('zh') ? 'zh' : 'en'
  );
  
  const containerRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && completedPiles.length < 8) {
      interval = setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, completedPiles.length]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveToHistory = (cols: Card[][], stk: Card[], comp: Card[][], moves: number, currentTime: number) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify({
      columns: cols,
      stock: stk,
      completedPiles: comp,
      moveCount: moves,
      time: currentTime
    }))].slice(-50));
  };

  const initGame = useCallback((diff: 1 | 2 | 4 = difficulty) => {
    const result = dealInitial(diff);
    setAnimAction('init');
    setColumns(result.columns);
    setStock(result.stock);
    setCompletedPiles([]);
    setDifficulty(diff);
    setSelectedCards(null);
    setMoveCount(0);
    setTime(0);
    setIsTimerRunning(false);
    setHint(null);
    setHistory([]);
    setDragTargetCol(null);
    setInvalidMove(false);
  }, [difficulty]);

  useEffect(() => {
    initGame();
  }, []);

  const toggleLang = () => setLang(prev => prev === 'zh' ? 'en' : 'zh');

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setAnimAction('undo');
    setColumns(prev.columns);
    setStock(prev.stock);
    setCompletedPiles(prev.completedPiles);
    setMoveCount(prev.moveCount);
    setTime(prev.time);
    setHistory(prev => prev.slice(0, -1));
    setSelectedCards(null);
    setDragTargetCol(null);
  };

  const handleHint = () => {
    const moves = findValidMoves(columns);
    if (moves.length > 0) {
      setHint(moves[0]);
      setTimeout(() => setHint(null), 2500);
    } else {
      alert(t.noMovesAlert);
    }
  };

  const triggerInvalidFeedback = () => {
    setInvalidMove(true);
    setTimeout(() => setInvalidMove(false), 500);
  };

  const tryMove = (fromColIdx: number, fromCardIdx: number, toColIdx: number): boolean => {
    if (fromColIdx === toColIdx) {
      setSelectedCards(null);
      setDragTargetCol(null);
      return false;
    }
    const movingSequence = columns[fromColIdx].slice(fromCardIdx);
    const targetColumn = columns[toColIdx];
    const targetCard = targetColumn.slice(-1)[0];

    if (canPlaceOn(movingSequence[0], targetCard)) {
      saveToHistory(columns, stock, completedPiles, moveCount, time);
      if (!isTimerRunning) setIsTimerRunning(true);

      const newColumns = columns.map(c => [...c]);
      newColumns[fromColIdx] = columns[fromColIdx].slice(0, fromCardIdx);
      newColumns[toColIdx] = [...columns[toColIdx], ...movingSequence];

      if (newColumns[fromColIdx].length > 0) {
        newColumns[fromColIdx][newColumns[fromColIdx].length - 1].isFaceUp = true;
      }

      setAnimAction('move');
      setColumns(newColumns);
      setMoveCount(prev => prev + 1);
      setSelectedCards(null);
      setDragTargetCol(null);
      setInvalidMove(false);

      const completeIdx = checkCompleteSequence(newColumns[toColIdx]);
      if (completeIdx !== -1) {
        setTimeout(() => {
          setColumns(currentCols => {
            const nextCols = currentCols.map(c => [...c]);
            const freshCompleteIdx = checkCompleteSequence(nextCols[toColIdx]);
            if (freshCompleteIdx !== -1) {
              setAnimAction('complete');
              const completedSeq = nextCols[toColIdx].splice(freshCompleteIdx, 13);
              setCompletedPiles(prev => {
                if (prev.some(p => p[0].id === completedSeq[0].id)) return prev;
                return [...prev, completedSeq];
              });
              if (nextCols[toColIdx].length > 0) {
                nextCols[toColIdx][nextCols[toColIdx].length - 1].isFaceUp = true;
              }
            }
            return nextCols;
          });
        }, 650);
      }
      return true;
    } else {
      triggerInvalidFeedback();
      setDragTargetCol(null);
      return false;
    }
  };

  const handleDealStock = () => {
    if (stock.length === 0) return;
    if (columns.some(col => col.length === 0)) {
      alert(t.emptyColumnAlert);
      return;
    }
    saveToHistory(columns, stock, completedPiles, moveCount, time);
    if (!isTimerRunning) setIsTimerRunning(true);

    setAnimAction('deal');
    const newColumns = columns.map(c => [...c]);
    const newStock = [...stock];
    for (let i = 0; i < 10; i++) {
      const card = newStock.pop()!;
      card.isFaceUp = true;
      newColumns[i].push(card);
    }
    setColumns(newColumns);
    setStock(newStock);
    setMoveCount(prev => prev + 1);

    setTimeout(() => {
      setColumns(currentCols => {
        const nextCols = currentCols.map(c => [...c]);
        const foundSeqs: Card[][] = [];
        let changed = false;
        for (let i = 0; i < 10; i++) {
          const cIdx = checkCompleteSequence(nextCols[i]);
          if (cIdx !== -1) {
            const seq = nextCols[i].splice(cIdx, 13);
            foundSeqs.push(seq);
            if (nextCols[i].length > 0) {
              nextCols[i][nextCols[i].length - 1].isFaceUp = true;
            }
            changed = true;
          }
        }
        if (changed) {
          setAnimAction('complete');
          setCompletedPiles(prev => {
            const filteredNew = foundSeqs.filter(newSeq => !prev.some(oldSeq => oldSeq[0].id === newSeq[0].id));
            return [...prev, ...filteredNew];
          });
          return nextCols;
        }
        return currentCols;
      });
    }, 1000);
  };

  const onDragEnd = (info: any, fromColIdx: number, fromCardIdx: number) => {
    if (containerRef.current) {
      const tableauRect = containerRef.current.getBoundingClientRect();
      const dropX = info.point.x - tableauRect.left;
      const colWidth = tableauRect.width / 10;
      const toColIdx = Math.floor(dropX / colWidth);
      if (toColIdx >= 0 && toColIdx < 10) {
        tryMove(fromColIdx, fromCardIdx, toColIdx);
      } else {
        triggerInvalidFeedback();
      }
    }
    setDragTargetCol(null);
  };

  return (
    <div className="game-container" ref={containerRef} onDoubleClick={() => setSelectedCards(null)}>
      <header>
        <div className="logo"><h1 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{t.title} <span style={{opacity: 0.5}}>{t.subtitle}</span></h1></div>
        <div className="stats-container">
          <div className="stat-box"><span className="stat-label">{t.moves}</span><span className="stat-value">{moveCount}</span></div>
          <div className="stat-box"><span className="stat-label">{t.time}</span><span className="stat-value">{formatTime(time)}</span></div>
          <div className="stat-box"><span className="stat-label">{t.stacks}</span><span className="stat-value">{completedPiles.length}/8</span></div>
        </div>
        <div className="controls">
          <button onClick={handleUndo} disabled={history.length === 0} title={t.undo}><RotateCcw size={16} /></button>
          <button onClick={handleHint} title={t.hint} style={{ background: 'rgba(255, 215, 0, 0.2)', color: '#ffd700' }}><HelpCircle size={16} /></button>
          <select value={difficulty} onChange={(e) => initGame(Number(e.target.value) as any)} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
            <option value={1}>{t.difficulty1}</option>
            <option value={2}>{t.difficulty2}</option>
            <option value={4}>{t.difficulty4}</option>
          </select>
          <div className="controls-group">
            <button onClick={toggleLang} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <Languages size={14} /> {t.langName}
            </button>
            <button 
              onClick={() => {
                if (moveCount === 0 || window.confirm(lang === 'zh' ? '确定要开始新游戏吗？进度将丢失。' : 'Start new game? Current progress will be lost.')) {
                  initGame();
                }
              }} 
              style={{ background: 'var(--accent-gold)', color: '#000' }} 
              title={t.newGame}
            >
              <Play size={14} fill="currentColor" />
            </button>
          </div>
        </div>
      </header>

      <div className="tableau">
        {columns.map((column, colIdx) => {
          const isHintTarget = hint?.toColIdx === colIdx;
          
          const renderRecursiveCards = (cards: Card[], currentIdx: number): React.ReactNode => {
            if (currentIdx >= cards.length) return null;
            
            const card = cards[currentIdx];
            const isSelected = selectedCards?.colIdx === colIdx && currentIdx >= selectedCards.cardIdx;
            const isHintSource = hint?.fromColIdx === colIdx && currentIdx === hint.fromCardIdx;
            const sequenceMovable = card.isFaceUp && canMoveSequence(cards.slice(currentIdx));
            
            return (
              <CardComponent
                key={card.id}
                card={card}
                cardIdx={currentIdx}
                colIdx={colIdx}
                isSelected={isSelected}
                isHintSource={isHintSource}
                isMovable={sequenceMovable}
                isInvalid={isSelected && invalidMove}
                animAction={animAction}
                onDragStart={() => {
                  setAnimAction('move');
                  setSelectedCards({ colIdx, cardIdx: currentIdx });
                }}
                onDragEnd={(info) => onDragEnd(info, colIdx, currentIdx)}
                onDrag={(info) => {
                  const tableauRect = containerRef.current?.getBoundingClientRect();
                  if (tableauRect) {
                    const dropX = info.point.x - tableauRect.left;
                    const toIdx = Math.floor(dropX / (tableauRect.width / 10));
                    if (toIdx >= 0 && toIdx < 10) setDragTargetCol(toIdx);
                    else setDragTargetCol(null);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setAnimAction('move');
                  if (selectedCards) {
                    tryMove(selectedCards.colIdx, selectedCards.cardIdx, colIdx);
                  } else {
                    if (sequenceMovable) setSelectedCards({ colIdx, cardIdx: currentIdx });
                    else triggerInvalidFeedback();
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setSelectedCards(null);
                }}
              >
                {renderRecursiveCards(cards, currentIdx + 1)}
              </CardComponent>
            );
          };

          return (
            <div 
              key={colIdx} 
              className={`column ${dragTargetCol === colIdx || isHintTarget ? 'highlight-target' : ''}`}
              style={{ zIndex: selectedCards?.colIdx === colIdx ? 20000 : 1 }}
            >
              <div 
                className="column-placeholder"
              onClick={() => {
                if (selectedCards) tryMove(selectedCards.colIdx, selectedCards.cardIdx, colIdx);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setSelectedCards(null);
              }}
            ></div>
            <AnimatePresence initial={false}>
              {renderRecursiveCards(column, 0)}
            </AnimatePresence>
          </div>
        );
      })}
    </div>

      <div className="bottom-bar">
        <div className="completed-area">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="completed-slot">
              {completedPiles[i]?.map((card) => (
                <motion.div 
                  key={card.id}
                  layoutId={card.id}
                  className="card-face" 
                  style={{ 
                    position: 'absolute', top: 0, left: 0, width: '35px', height: '50px', 
                    background: 'white', border: '1px solid #ccc', borderRadius: '3px', 
                    textAlign: 'center', lineHeight: '50px', fontWeight: 'bold',
                    color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#d63031' : '#2d3436',
                    zIndex: card.rank
                  }}
                >
                  {card.rank === 13 ? 'K' : ''}
                </motion.div>
              ))}
            </div>
          ))}
        </div>
        <motion.div whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }} className="stock-pile" onClick={handleDealStock} style={{ visibility: stock.length > 0 ? 'visible' : 'hidden' }}>
          {stock.length / 10}
        </motion.div>
      </div>

      <AnimatePresence>
        {completedPiles.length === 8 && (
          <div className="win-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20000 }}>
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ textAlign: 'center', color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '40px 60px', borderRadius: '24px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <Trophy size={100} color="var(--accent-gold)" style={{ marginBottom: '20px' }} />
              <h1 style={{ fontSize: '3.5rem', margin: '0 0 20px 0', fontWeight: 900 }}>{t.winTitle}</h1>
              <div style={{ fontSize: '1.2rem', marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '10px', opacity: 0.9 }}>
                <p style={{ margin: 0 }}>{t.totalMoves}: <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{moveCount}</span></p>
                <p style={{ margin: 0 }}>{t.totalTime}: <span style={{ color: 'var(--accent-gold)', fontWeight: 'bold' }}>{formatTime(time)}</span></p>
              </div>
              <button onClick={() => initGame()} style={{ padding: '15px 50px', background: 'var(--accent-gold)', color: '#000', border: 'none', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', transition: 'transform 0.2s' }}>
                {t.playAgain}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
