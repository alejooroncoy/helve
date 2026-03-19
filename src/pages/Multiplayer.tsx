import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import MultiplayerLobby from "@/components/multiplayer/MultiplayerLobby";
import MultiplayerPicking from "@/components/multiplayer/MultiplayerPicking";
import MultiplayerSimulation from "@/components/multiplayer/MultiplayerSimulation";
import MultiplayerResults from "@/components/multiplayer/MultiplayerResults";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Multiplayer = () => {
  const mp = useMultiplayer();

  return (
    <div className="min-h-screen bg-background relative">
      {mp.room?.status === "playing" && (
        <LanguageSwitcher className="absolute top-4 right-4 z-50" />
      )}
      <AnimatePresence mode="wait">
        {(!mp.room || mp.room.status === "waiting") && (
          <MultiplayerLobby key="lobby" mp={mp} />
        )}
        {mp.room?.status === "picking" && (
          <MultiplayerPicking key="picking" mp={mp} />
        )}
        {mp.room?.status === "playing" && (
          <MultiplayerSimulation key="simulation" mp={mp} />
        )}
        {mp.room?.status === "finished" && (
          <MultiplayerResults key="results" mp={mp} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Multiplayer;
