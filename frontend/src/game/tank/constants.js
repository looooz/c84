export const TILE = {
  EMPTY: 0,
  BRICK: 1,
  STEEL: 2,
  GRASS: 3,
  WATER: 4,
  BASE: 5,
  BASE_DESTROYED: 6
}

export const DIRECTION = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
}

export const TANK_TYPE = {
  PLAYER: 'player',
  ENEMY_BASIC: 'enemy_basic',
  ENEMY_FAST: 'enemy_fast',
  ENEMY_ARMOR: 'enemy_armor',
  ENEMY_POWER: 'enemy_power'
}

export const POWERUP_TYPE = {
  STAR: 'star',
  SHIELD: 'shield',
  BOMB: 'bomb',
  LIFE: 'life',
  SHOVEL: 'shovel',
  CLOCK: 'clock'
}

export const GAME_CONFIG = {
  TILE_SIZE: 32,
  MAP_COLS: 13,
  MAP_ROWS: 13,
  PLAYER_SPEED: 2,
  ENEMY_SPEED_BASIC: 1,
  ENEMY_SPEED_FAST: 2,
  ENEMY_SPEED_ARMOR: 0.8,
  ENEMY_SPEED_POWER: 1.2,
  BULLET_SPEED: 5,
  BULLET_SPEED_FAST: 7,
  FIRE_COOLDOWN: 500,
  SHIELD_DURATION: 8000,
  CLOCK_DURATION: 5000,
  MAX_ENEMIES_ON_SCREEN: 4,
  TOTAL_ENEMIES_PER_LEVEL: 20,
  PLAYER_INITIAL_LIVES: 3
}
