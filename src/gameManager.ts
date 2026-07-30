import type { GameObj } from "kaplay";
import { k } from "./lib/kaplayCtx";
import { MAX_PLAYERS } from "./constants";

function makeGameManager() {
  return k.add([
    k.state("menu", [
      "menu",
      "cutscene",
      "round-start",
      "round-end",
      "hunt-start",
      "hunt-end",
      "duck-hunted",
      "duck-escaped",
    ]),
    {
      isGamePaused: false,
      currentScore: new Array(MAX_PLAYERS).fill(0),
      currentRoundNumber: 0,
      currentHuntNumber: 0,
      numberBulletsLeft: new Array(MAX_PLAYERS).fill(3),
      numberDucksShotInRound: 0,
      finalRound: 3,
      preySpeed: 65,
      resetGameState(this: GameObj) {
        this.isGamePaused = false;
        this.currentScore = new Array(MAX_PLAYERS).fill(0);
        this.currentRoundNumber = 0;
        this.currentHuntNumber = 0;
        this.numberBulletsLeft = new Array(MAX_PLAYERS).fill(3);
        this.numberDucksShotInRound = 0;
        this.preySpeed = 65;
      },
    },
  ]);
}

export const gameManager = makeGameManager();
