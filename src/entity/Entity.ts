import GameServer from '../GameServer';
import { JsonProperty } from 'json2typescript';
import EntityType from './EntityType';
import Player from './Player';
import { GameMap, GameBiome } from './GameMap';

export enum EntityState {
    None = 0,
    Delete = 1,
    Hurt = 2,
    Cold = 4,
    Hunger = 8,
    Attack = 16,
    Walk = 32,
    Idle = 64,
    Heal = 128,
    Web = 256
}

export default class Entity {
    gameServer: GameServer;
    @JsonProperty("i")
    id: number;
    owner: Player | undefined = undefined;
    type: EntityType = new EntityType();
    angle: number = 0;
    body!: Matter.Body;
    state: EntityState = EntityState.None;
    private _health: number;
    action: boolean = true;
    speed: number;

    entityData: number[];

    get health() {
        return this._health;
    }

    set health(value: number) {
        this._health = value;
        if (this.health <= 0) {
            this._health = 0;
            this.gameServer.deleteEntity(this);
        }
    }

    dealDamage(value: number, damager: Entity | undefined) {
        this.health -= value;
    }

    getBinaryHealth(): number {
        return Math.round((this.health / this.type.health) * 100);
    }

    getCurrentBiome(map: GameMap = this.gameServer.map): GameBiome {
        return map.biomes.find(x => x.bounds.contains(this.body.position)) || map.fallbackBiome;
    }

    constructor(gameServer: GameServer, type: EntityType) {
        this.gameServer = gameServer;
        this.type = type;
        this.health = type.health || 100;
        this.speed = type.speed || 0;
    }
}