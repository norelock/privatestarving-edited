import { Vector } from "matter-js";
import { MapEntity, MapEntityType } from './MapEntity';
import GameServer from '../GameServer';
import Matter from "matter-js";

export class Bounds {
    min: Vector;
    max: Vector;

    contains(vector: Vector) {
        return this.min.x <= vector.x && this.max.x >= vector.x && vector.x <= this.min.x + this.max.x &&
            this.min.y <= vector.y && this.max.y >= vector.y && vector.y <= this.min.y + this.max.y;
    }

    constructor(min: Vector, max: Vector) {
        this.min = min;
        this.max = max;
    }
}

export enum BiomeType {
    Forest,
    Winter,
    Ocean,
    Cave,
    Lava,
    Island
}

let SpeedMultipliers = {};
SpeedMultipliers[BiomeType.Forest] = 0;
SpeedMultipliers[BiomeType.Winter] = SpeedMultipliers[BiomeType.Lava] = SpeedMultipliers[BiomeType.Cave] = -20;
SpeedMultipliers[BiomeType.Ocean] = -70;
SpeedMultipliers[BiomeType.Island] = 20;
export { SpeedMultipliers };

export class GameBiome {
    biomeType: BiomeType;
    bounds: Bounds;

    constructor(biomeType: BiomeType, bounds: Bounds = new Bounds({ x: 0, y: 0 }, { x: 0, y: 0 })) {
        this.biomeType = biomeType;
        this.bounds = bounds;
    }
}

export interface GameMap {
    mapBounds: Bounds;
    biomes: GameBiome[];
    spawnBiomes: GameBiome[];
    fallbackBiome: GameBiome;
    entities: MapEntity[];
    seed: number;
    initialize: (gameServer: GameServer) => Promise<void>;
}

export class Eu1Map implements GameMap {
    mapBounds: Bounds;
    biomes: GameBiome[];
    spawnBiomes: GameBiome[];
    fallbackBiome: GameBiome;
    entities: MapEntity[] = [];
    seed: number = 41220;

    async initialize(gameServer: GameServer) {
        const mapJson = await import("../data/map/eu1.json");

        this.mapBounds = new Bounds({ x: 0, y: 0 }, { x: mapJson.width * 100, y: mapJson.height * 100 });
        this.biomes = [
            new GameBiome(BiomeType.Winter, new Bounds({ x: 1272, y: 4382 }, { x: 11228, y: 13607 })),
            new GameBiome(BiomeType.Lava, new Bounds({ x: 3200, y: 15880 }, { x: 11720, y: 24010 })),
            new GameBiome(BiomeType.Ocean),
            new GameBiome(BiomeType.Cave, new Bounds({ x: 18486, y: 3386 }, { x: 21224, y: 5706 })),
            new GameBiome(BiomeType.Forest, new Bounds({ x: 13476, y: 7283 }, { x: 23538, y: 16012 })),
            new GameBiome(BiomeType.Forest, new Bounds({ x: 12770, y: 19281 }, { x: 19129, y: 24014 })),
        ];
        this.spawnBiomes = this.biomes.filter(x => x.biomeType === BiomeType.Forest);
        this.fallbackBiome = this.biomes.find(x => x.biomeType === BiomeType.Ocean)!;

        for (const columns of mapJson.entities.filter(x => x)) {
            if (columns) {
                for (const rows of columns) {
                    if (rows) {
                        for (const type in rows) {
                            // noinspection JSUnfilteredForInLoop
                            const entity = rows[type];
                            if (type && entity) {
                                let pos: any = {};
                                pos.typeId = type;
                                pos.nulls = 0;

                                if (entity.constructor === Array) {
                                    for (const info of entity) {
                                        if (info) {
                                            for (const infoPos of info) {
                                                if (infoPos && infoPos.x !== undefined && infoPos.y !== undefined) {
                                                    pos.x = infoPos.x;
                                                    pos.y = infoPos.y;
                                                }
                                            }
                                            break;
                                        } else {
                                            pos.nulls++;
                                        }
                                    }
                                } else {
                                    pos.x = entity.x;
                                    pos.y = entity.y;
                                    break;
                                }

                                if (pos && pos.x !== undefined && pos.y !== undefined) {
                                    this.entities.push(pos);
                                }
                            }
                        }
                    }
                }
            }
        }

        let unknownTypes: string[] = [];
        for (const mapEntity of this.entities) {
            if (mapEntity.typeId === "h" || mapEntity.typeId === "hw" || mapEntity.typeId === "hl" || mapEntity.typeId === "sl") {
                continue;
            }

            const type = MapEntityType.list.find(x => x.id.split(";").includes(mapEntity.typeId));
            if (type) {
                mapEntity.body = gameServer.createBody(type.collision.replace("$n", type.sizes[mapEntity.nulls]), mapEntity);
                mapEntity.body.label = mapEntity.typeId;
                mapEntity.type = type;
                Matter.World.add(gameServer.engine.world, mapEntity.body);
            } else {
                if (!unknownTypes.includes(mapEntity.typeId))
                    unknownTypes.push(mapEntity.typeId);
            }
        }
        if (unknownTypes.length > 0) {
            console.warn("Unknown map types: " + unknownTypes.join(", "))
        }

        console.log(`Parsed ${this.entities.length} map entities`);
    }
}
