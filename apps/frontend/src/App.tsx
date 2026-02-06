
import { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';

interface JoinData {
  roomId: string;
  playerName: string;
}

function App() {
  const [joinData, setJoinData] = useState<JoinData | null>(null);

  const handleJoin = (roomId: string, playerName: string) => {
    setJoinData({ roomId, playerName });
  };

  if (!joinData) {
    return <Lobby onJoin={handleJoin} />;
  }

  return <GameBoard roomId={joinData.roomId} playerName={joinData.playerName} />;
}

export default App;
