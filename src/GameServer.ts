import Player from './entity/Player'
import * as WebSocket from "ws";
import Entity, { EntityState } from './entity/Entity';
import Matter, { IBodyDefinition } from 'matter-js';
import { MoveDirection } from './packet/json/MovePacket';
import { GameMap, Eu1Map, SpeedMultipliers } from './entity/GameMap';
import { Vector } from 'matter-js';
import CommandManager from './command/CommandManager';
import Papa from 'papaparse';
import fetch from 'node-fetch';
import Item, { ItemStack, ItemType } from './entity/Item';
import EntityType from './entity/EntityType';
import Recipe from './entity/Recipe';
import { JsonConvert } from 'json2typescript';
import Utils from './Utils';
import * as config from "./data/config.json";
import { UnitsPacket, DeletePacket } from './packet/binary/UnitsPacket';
import { MapEntityType } from './entity/MapEntity';
import { MapEntityPunchPacket, EntityPunchPacket } from './packet/binary/PunchPacket';
import { Source } from './entity/EntityType';
import { LocalizedMessagePacket, LocalizedMessage } from './packet/binary/LocalizedMessagePacket';
import { SetSourcePacket } from './packet/binary/SetSourcePacket';
import { BiomeType } from './entity/GameMap';
import WallEntity from './entity/structure/WallEntity';
import WellEntity from './entity/structure/WellEntity';
import WindmillEntity from './entity/structure/WindmillEntity';
import ChestEntity from './entity/structure/ChestEntity';
import BerriesEntity from './entity/structure/BerriesEntity';
import DoorEntity from './entity/structure/DoorEntity';
import { SetStatsPacket } from './packet/binary/SetStatPacket';
import NanoTimer from 'nanotimer';

export default class GameServer {
    initialized: boolean = false;
    players: Player[] = [];
    entities: Entity[] = [];
    starveVersion: number = 39;
    tps: number = 32;
    night: boolean;
    time: number = 0;
    daytime: number = 4 * 60 * 1000;

    findPlayerByWs(ws: any): Player | undefined {
        return this.players.find((p) => p && p.ws == ws);
    }

    addEntity(entity: Entity, spawn: Vector, collision: string = entity.type.collision, bodySettings: IBodyDefinition | undefined = undefined): Entity {
        let entities: Entity[];
        if (entity instanceof Player) {
            entity.body = Matter.Bodies.circle(spawn.x, spawn.y, 25, { ...bodySettings, ...{ collisionFilter: { mask: 0x0001, category: 0x0002, group: 0 } } });
            entity.body.label = "Player";
            entities = this.players;
        } else {
            entity.body = this.createBody(collision, spawn, bodySettings);
            entity.body.label = entity.type.name;
            entities = this.entities;
        }

        const notOwned = entity.owner ? entity.owner.ownedEntities : entities.filter(x => x.owner == undefined);
        for (let i = 1; i <= (entity instanceof Player ? config.maxPlayers : 256 ** 2); i++) {
            if (notOwned.findId(i) == undefined) {
                entity.id = i;
                break;
            }
        }

        if (entity.owner) {
            entity.owner.ownedEntities.push(entity);
        }

        entities.push(entity);

        Matter.Body.setAngle(entity.body, Utils.binaryAngleToRadians(entity.angle));
        Matter.World.add(this.engine.world, entity.body);
        this.visionRefresh(entity instanceof Player ? [entity] : []);
        return entity;
    }

    createBody(collisions: string = "circle:40", spawn: Vector, bodySettings: IBodyDefinition | undefined = undefined): Matter.Body {
        let body: Matter.Body = Matter.Bodies.circle(spawn.x, spawn.y, 0, bodySettings);
        if (collisions != undefined) {
            for (const collision of collisions.split(";")) {
                const collisionArgs = collision.split(":");
                switch (collisionArgs[0]) {
                    case "circle":
                        body = Matter.Bodies.circle(spawn.x, spawn.y, Number.parseInt(collisionArgs[1]) || 40, bodySettings);
                        break;
                    case "square":
                        const side = Number.parseInt(collisionArgs[1]);
                        body = Matter.Bodies.rectangle(spawn.x, spawn.y, side, side, bodySettings);
                        break;
                    case "rectangle":
                        const sideX = Number.parseInt(collisionArgs[1]);
                        const sideY = Number.parseInt(collisionArgs[2]);
                        body = Matter.Bodies.rectangle(spawn.x, spawn.y, sideX, sideY, bodySettings);
                        break;
                    case "sensor":
                        body.isSensor = true;
                        break;
                    case "none":
                        break;
                    case "scale":
                        const scale = Number.parseFloat(collisionArgs[1]);
                        Matter.Body.scale(body, scale, scale);
                        break;
                    default:
                        const fixtures = this.collisions[collisionArgs[0]].fixtures;
                        const parts: Matter.Body[] = [];
                        for (const fixture of fixtures) {
                            if (fixture.circle) {
                                parts.push(Matter.Bodies.circle(spawn.x + fixture.circle.x, spawn.y + fixture.circle.y, fixture.circle.radius))
                            }

                            if (fixture.vertices) {
                                parts.push(Matter.Bodies.fromVertices(spawn.x, spawn.y, fixture.vertices))
                            }
                        }
                        body = Matter.Body.create({ ...bodySettings, parts });
                        break;
                }
                Matter.Body.scale(body, 0.95, 0.95);
                body.friction = 0;
                body.frictionAir = 0
            }
        }
        if (bodySettings === undefined || bodySettings.isStatic === undefined) {
            Matter.Body.setStatic(body, true);
        }
        return body;
    }

    deleteEntity(entity: Entity) {
        if (entity instanceof Player) {
            for (const e of entity.ownedEntities) {
                this.deleteEntity(e);
            }
        }

        entity.state = EntityState.Delete;

        for (const player of this.players.filter(p => p.visibleEntities.includes(entity))) {
            if (player !== undefined) {
                Utils.sendPacket(player.ws, new DeletePacket(entity));
            }
        }

        if (entity.owner) {
            entity.owner.ownedEntities.delete(entity);
        }

        Matter.World.remove(this.engine.world, entity.body);
        if (entity instanceof Player) {
            for (let player of this.players) {
                if (player !== undefined) {
                    if (player.ws.readyState === WebSocket.CLOSED && player.ws.readyState !== 3) {
                        //Matter.World.remove(this.engine.world, player.body);
                        //delete this.players[player.id];
                        this.players.delete(entity);
                    }
                }
            }
        } else {
            this.entities.delete(entity);
        }
    }

    updateLeaderboard() {
        for (const player of this.players) {
            if (player !== undefined) {
                player.sendLeaderboard(this);
            }
        }
    }

    async downloadItems<T>(url: string, type: { new(): T }): Promise<T[]> {
        const csv = await fetch(url);
        const results = Papa.parse(await csv.text(), { header: true, dynamicTyping: true });
        const jsonConvert = new JsonConvert();
        return results.data.map(x => jsonConvert.deserialize(x, type) as T);
    }

    commandManager: CommandManager = new CommandManager(this);
    map: GameMap = new Eu1Map();
    engine!: Matter.Engine;
    collisions: any;

    async start() {
        this.collisions = await import("./data/collisions.json");
        Item.list = await this.downloadItems("https://docs.google.com/spreadsheets/d/e/2PACX-1vRIlhLSx0P44xP04e0zavfka5ypfu6D4Scmo3Qegc43Dr1MLKDK4Zi0s_ZkCCENHhvHGO3IRS3T8nIW/pub?gid=0&single=true&output=csv", Item);
        for (const [i, item] of Item.list.filter(x => x.type === ItemType.Structure).entries()) {
            item.structureId = i + 1;
        }
        Item.hand = Item.list.findId(14)!;
        console.log(`Loaded ${Item.list.length} items`);

        EntityType.list = await this.downloadItems("https://docs.google.com/spreadsheets/d/e/2PACX-1vQxOUupUEXACSYHQMjHZ_EKsQ5FdE1-5zjIt38Z8g5B3wG8ASaG3-BvskNV0ti02r9u0GvPrQZ_FOFo/pub?gid=1736236970&single=true&output=csv", EntityType);
        for (const type of EntityType.list) {
            if (type.className) {
                switch (type.className) {
                    case "Player":
                        type.class = Player as any as typeof Entity;
                        break;
                    case "Well":
                        type.class = WellEntity;
                        break;
                    case "Wall":
                        type.class = WallEntity;
                        break;
                    case "Windmill":
                        type.class = WindmillEntity;
                        break;
                    case "Chest":
                        type.class = ChestEntity;
                        break;
                    case "Berries":
                        type.class = BerriesEntity;
                        break;
                    case "Door":
                        type.class = DoorEntity;
                        break;
                }
            }
        }
        console.log(`Loaded ${EntityType.list.length} entity types`);
        MapEntityType.list = await this.downloadItems("https://docs.google.com/spreadsheets/d/e/2PACX-1vQxOUupUEXACSYHQMjHZ_EKsQ5FdE1-5zjIt38Z8g5B3wG8ASaG3-BvskNV0ti02r9u0GvPrQZ_FOFo/pub?gid=1769456071&single=true&output=csv", MapEntityType);
        console.log(`Loaded ${MapEntityType.list.length} map entities`);
        const jsonConvert = new JsonConvert();
        Recipe.list = (await import('./data/recipes.json')).default.map(x => jsonConvert.deserialize(x, Recipe) as Recipe);
        console.log(`Loaded ${Recipe.list.length} recipes`);

        await this.commandManager.loadCommands();
        this.engine = Matter.Engine.create();
        const world = this.engine.world;
        world.gravity.x = 0;
        world.gravity.y = 0;

        await this.map.initialize(this);

        const bounds = this.map.mapBounds;
        Matter.World.add(world, [
            // top
            Matter.Bodies.rectangle(0, -1, bounds.max.x * 2, 1, { isStatic: true }),
            // bottom
            Matter.Bodies.rectangle(0, bounds.max.y, bounds.max.x * 2, 1, { isStatic: true }),
            // left
            Matter.Bodies.rectangle(-1, 0, 1, bounds.max.y * 2, { isStatic: true }),
            // right
            Matter.Bodies.rectangle(bounds.max.x, 0, 1, bounds.max.y * 2, { isStatic: true })
        ]);

        let lastPos!: any;
        const collisionCells: Entity[] = [];

        new NanoTimer().setInterval(() => {
            for (const cell of collisionCells) {
                this.deleteEntity(cell);
                collisionCells.delete(cell);
            }

            for (const pair of this.engine.pairs.list as Matter.IPair[]) {
                if (pair.isActive && pair.bodyA.label == "Player" || pair.bodyB.label == "Player") {
                    if (config.debug.drawMap) {
                        const mapEntity = this.map.entities.find(x => x.body == pair.bodyA);
                        if (mapEntity && lastPos != mapEntity) {
                            console.log(mapEntity.typeId, mapEntity.nulls, pair.bodyA.position);
                            lastPos = mapEntity;
                        }
                    }

                    if (config.debug.drawCollisionContacts) {
                        for (const contact of pair.activeContacts) {
                            if (contact.vertex) {
                                collisionCells.push(Utils.spawnCell(this, contact.vertex.x, contact.vertex.y));
                            }
                        }
                    }
                }
            }
        }, [], 1 / 8 + "s");

        Matter.Events.on(this.engine, "collisionStart", (e: Matter.IEventCollision<Matter.Engine>) => {
            for (const pair of e.pairs) {
                if (pair.isActive) {
                    if (pair.bodyA.label == "attackBox" || pair.bodyB.label == "attackBox") {
                        const attackBox = pair.bodyA.label == "attackBox" ? pair.bodyA : pair.bodyB;
                        const player = this.players.find(x => x === undefined ? false : x.attackBox === attackBox);
                        // can you handle disconnects? like not deaths in index.ts
                        // wait just
                        if (player) {
                            const attacked = pair.bodyA.label == "attackBox" ? pair.bodyB.parent : pair.bodyA.parent;

                            const damage = player.inventory.equippedItem.damage;
                            const attackedPlayer = this.players.find(x => x.body == attacked);
                            const mapEntity = this.map.entities.find(x => x.body == attacked);
                            const entity = this.entities.find(x => x.body == attacked);
                            if (attackedPlayer && player != attackedPlayer) {
                                attackedPlayer.state |= EntityState.Hurt;
                                const helmet = attackedPlayer.inventory.equippedHelmet;
                                attackedPlayer.dealDamage((damage.pvp - (helmet ? helmet.defense.pvp : 0)) || 1, player);
                                attackedPlayer.action = true;
                            } else if (mapEntity) {
                                let packet = new MapEntityPunchPacket(mapEntity, player);
                                for (const otherPlayer of this.players) {
                                    Utils.sendPacket(otherPlayer.ws, packet);
                                }
                                const item = Item.list.findId(mapEntity.type.itemId);
                                if (item) {
                                    let amount = mapEntity.type.tier === 0 ? 1 : 0;
                                    if (player.inventory.equippedItem && ItemType[player.inventory.equippedItem.type] == mapEntity.type.type) {
                                        amount = player.inventory.equippedItem.tier + 1 - mapEntity.type.tier;
                                        if (player.inventory.equippedItem.type == ItemType.Pitchfork) {
                                            amount *= 2;
                                        }
                                    }
                                    if (amount > 0)
                                        player.inventory.addItem([new ItemStack(item, amount)]);
                                    else
                                        Utils.sendPacket(player.ws, new LocalizedMessagePacket(LocalizedMessage.NotRightTool));
                                }
                            } else if (entity) {
                                entity.dealDamage(damage.pve || 1, player);
                                entity.action = true;
                                let packet = new EntityPunchPacket(entity, player);
                                for (const otherPlayer of this.players) {
                                    Utils.sendPacket(otherPlayer.ws, packet);
                                }
                            }

                            Matter.World.remove(this.engine.world, attackBox);
                        }
                    }
                }
            }
        });

        Matter.Events.on(this.engine, "collisionEnd", () => {

        });

        new NanoTimer().setInterval(this.update, [], 1 / this.tps + "s");
        new NanoTimer().setInterval(this.visionRefresh, [], 1 / 2 + "s");
        new NanoTimer().setInterval(this.render, [], 1 / 16 + "s");
        new NanoTimer().setInterval(this.updateStats, [], "5s");

        this.commandManager.consoleInput();

        this.initialized = true;
        console.log("Initialized");
    }

    updateStats = (): void => {
        for (let player of this.players) {
            if (player !== undefined) { // now he deleted me from table and im totally frozen
                player.sendPackets = false;
                player.health += 56;
                Utils.sendPacket(player.ws, new SetStatsPacket(player));
                player.sendPackets = true;
            }
        }
    };

    update = (): void => {
        Matter.Engine.update(this.engine, 1000 / this.tps);

        for (let player of this.players) {
            if (player !== undefined) {
                Matter.Body.setPosition(player.body, {
                    x: player.body.position.x.clamp(this.map.mapBounds.min.x, this.map.mapBounds.max.x - 1),
                    y: player.body.position.y.clamp(this.map.mapBounds.min.y, this.map.mapBounds.max.y - 1)
                });

                if (player.direction != MoveDirection.None) {
                    player.action = true;
                }

                const biome = player.getCurrentBiome();
                let x = 0;
                let y = 0;
                let speed = player.type.speed;

                let biomeType = biome.biomeType;
                if (Utils.hasFlag(player.source, Source.Island)) {
                    biomeType = BiomeType.Forest;
                } else if (Utils.hasFlag(player.source, Source.Water)) {
                    biomeType = BiomeType.Ocean;
                }
                speed += SpeedMultipliers[biomeType];

                if (player.inventory.equippedItem.isCombatItem()) {
                    speed -= 40;
                }

                if (player.isAttacking) {
                    speed -= 30;
                }

                if (Utils.hasFlag(player.source, Source.River)) {
                    speed -= Utils.hasFlag(player.direction, MoveDirection.Down) ? 40 : 90;
                    player.action = true;
                }

                player.speed = speed;
                speed /= this.tps;

                if ((player.direction & (player.direction - 1)) != 0) {
                    speed /= Math.sqrt(2);
                }

                if (Utils.hasFlag(player.direction, MoveDirection.Up)) {
                    y -= speed;
                } else if (Utils.hasFlag(player.source, Source.River) || Utils.hasFlag(player.direction, MoveDirection.Down)) {
                    y += speed;
                }

                if (Utils.hasFlag(player.direction, MoveDirection.Left)) {
                    x -= speed;
                } else if (Utils.hasFlag(player.direction, MoveDirection.Right)) {
                    x += speed;
                }

                Matter.Body.setAngle(player.body, Utils.binaryAngleToRadians(player.angle));
                Matter.Body.setVelocity(player.body, { x: x, y: y });
            }
        }
    };

    visionRefresh = (ignore: Player[] = []): void => {
        for (let player of this.players.filter(x => !ignore.includes(x))) {
            if (player !== undefined) {
                let lastSource = player.source;
                player.source = Source.None;
                let width = player.width / 2;
                let height = player.height / 2;

                if (player.getCurrentBiome().biomeType === BiomeType.Ocean) {
                    player.source = Source.Water;
                }

                for (let entity of this.entities) {
                    if (entity.type && entity.type.source != undefined && entity.type.source != Source.None) {
                        if (Math.hypot(player.body.position.x - entity.body.position.x, player.body.position.y - entity.body.position.y) < 200) {
                            player.source |= entity.type.source;
                        }
                    }
                }

                for (const pair of this.engine.pairs.list as Matter.IPair[]) {
                    if (pair.isActive) {
                        if (pair.bodyA == player.body || pair.bodyB == player.body) {
                            let mapEntity = this.map.entities.find(x => x.body === (pair.bodyA === player.body ? pair.bodyB : pair.bodyA));
                            if (mapEntity && mapEntity.type && mapEntity.type.source != undefined && mapEntity.type.source != Source.None) {
                                player.source |= mapEntity.type.source;
                            }
                        }
                    }
                }

                for (let entity of this.entities.concat(this.players)) {
                    if (entity !== undefined) {
                        if (Math.abs(player.body.position.x - entity.body.position.x) < width && Math.abs(player.body.position.y - entity.body.position.y) < height) {
                            if (!player.visibleEntities.includes(entity)) {
                                player.visibleEntities.push(entity);
                                if (!entity.action) {
                                    Utils.sendPacket(player.ws, new UnitsPacket(entity));
                                }
                            }
                        } else {
                            if (player.visibleEntities.includes(entity)) {
                                player.visibleEntities.delete(entity);
                                Utils.sendPacket(player.ws, new DeletePacket(entity));
                            }
                        } 
                    }
                }

                if (!player.crafting && lastSource != player.source) {
                    for (const sourceValue in Source) {
                        // noinspection JSUnfilteredForInLoop
                        const source: Source = Number.parseInt(sourceValue);
                        if (!isNaN(source) && source !== 0) {
                            if ((lastSource & source) != (player.source & source) && ((lastSource & source) == source || (player.source & source) == source)) {
                                if (source === Source.Fire || source === Source.Workbench || source === Source.Water)
                                    Utils.sendPacket(player.ws, new SetSourcePacket(source, Utils.hasFlag(player.source, source)));
                            }
                        }
                    }
                }
            }
        }
    };

    render = (): void => {
        for (const player of this.players) {
            if (player !== undefined) {
                const visibleEntities = player.visibleEntities.filter(e => e.action);
                if (visibleEntities.length > 0) {
                    Utils.sendPacket(player.ws, new UnitsPacket(...visibleEntities));
                }
            }
        }

        for (const entity of this.entities.concat(this.players)) {
            if (entity !== undefined) {
                entity.state = EntityState.None;
                entity.action = false;
            }
        }
    }
}
