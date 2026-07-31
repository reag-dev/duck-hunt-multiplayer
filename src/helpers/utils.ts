import { k } from "../lib/kaplayCtx";
import { players } from "../main";
import { gameManager } from "../gameManager";
import type { PlayerInput } from "../types/ws";

export function formatScore(score: number, nbDigits: number) {
  return score.toString().padStart(nbDigits, "0");
}

export function handleShot(playerId: number) {
  if (
    gameManager.state !== "hunt-start" ||
    gameManager.numberBulletsLeft[playerId - 1] <= 0
  )
    return;

  k.play("gun-shot", { volume: 0.5 });
  gameManager.numberBulletsLeft[playerId - 1]--;

  const player = players.get(playerId);
  if (!player) return;

  const cursorPos = player.cursor.pos;

  const duck = k.get("duck")[0];
  if (!duck || !duck.area || duck.hasBeenShot) return;

  if (duck.hasPoint(cursorPos)) {
    duck.huntedBy = playerId;
    duck.isAlive = false;
  }
}

export function handlePlayerInput(
  playerId: number,
  payload: PlayerInput,
  shoot?: (playerId: number) => void,
) {
  const player = players.get(playerId);
  if (!player) return;

  // 🎯 RECALIBRAR
  if (payload.recalibrate) {
    player.targetX = k.center().x;
    player.targetY = k.center().y;
    return;
  }

  // 🎮 PONTEIRO ABSOLUTO
  if (payload.gamma !== undefined && payload.beta !== undefined) {
    player.targetX = k.map(payload.gamma, -30, 30, 0, k.width());
    player.targetY = k.map(-payload.beta, -30, 30, 0, k.height());
  }

  // 🔫 TIRO
  if (payload.shoot) {
    shoot?.(playerId);
  }
}
