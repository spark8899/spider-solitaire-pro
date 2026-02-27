export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    title: '蜘蛛纸牌',
    subtitle: '专业版',
    moves: '步数',
    time: '用时',
    stacks: '回收',
    newGame: '新游戏',
    undo: '撤销',
    hint: '提示',
    difficulty1: '单色 (简单)',
    difficulty2: '双色 (中等)',
    difficulty4: '四色 (困难)',
    deal: '发牌',
    emptyColumnAlert: '每列都必须有牌才能发牌！',
    noMovesAlert: '没有可移动的步数，请发牌！',
    winTitle: '恭喜获胜!',
    totalMoves: '总计步数',
    totalTime: '总计用时',
    playAgain: '再玩一次',
    langName: 'EN'
  },
  en: {
    title: 'SPIDER',
    subtitle: 'PRO',
    moves: 'Moves',
    time: 'Time',
    stacks: 'Stacks',
    newGame: 'New Game',
    undo: 'Undo',
    hint: 'Hint',
    difficulty1: '1 Suit (Easy)',
    difficulty2: '2 Suits (Medium)',
    difficulty4: '4 Suits (Hard)',
    deal: 'DEAL',
    emptyColumnAlert: 'Must have a card in every column to deal!',
    noMovesAlert: 'No moves available. Deal more cards!',
    winTitle: 'YOU WIN!',
    totalMoves: 'Total Moves',
    totalTime: 'Total Time',
    playAgain: 'PLAY AGAIN',
    langName: '中'
  }
};
