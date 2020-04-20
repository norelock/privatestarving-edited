import * as WebSocket from 'ws';
import GameServer from "../GameServer";
import { HandshakePacket } from '../packet/json/HandshakePacket';
import Entity from './Entity';
import { JsonProperty, JsonConvert } from "json2typescript";
import Utils from "../Utils";
import { SendChatPacket } from '../packet/json/ChatPacket';
import PlayerInventory from './PlayerInventory';
import { EntityState } from './Entity';
import EntityType, { Source } from "./EntityType";
import ICommandSource from "../command/ICommandSource";
import { MoveDirection } from '../packet/json/MovePacket';
import { LeaderboardPacket } from "../packet/binary/LeaderboardPacket";
import Matter from "matter-js";
import { SetStatPacket, StatType } from '../packet/binary/SetStatPacket';
import { KillPacket, KillReason } from '../packet/binary/KillPacket';
import { Stats } from '../Utils';
import { $enum } from "ts-enum-util";

export default class Player extends Entity implements ICommandSource {
    @JsonProperty("n")
    nickname: string;

    @JsonProperty("p")
    points: number = 0;

    @JsonProperty("l")
    level: number = 0;

    kills: number = 0;

    crafting: boolean = false;
    source: Source = Source.None;
    direction: MoveDirection = MoveDirection.None;
    visibleEntities: Entity[] = [];
    ownedEntities: Entity[] = [];
    width: number;
    height: number;

    skin: PlayerSkin;
    inventory: PlayerInventory = new PlayerInventory(this);
    ws: WebSocket;

    willAttack: boolean;
    isAttacking: boolean;
    attackInterval!: NodeJS.Timeout;
    attackBox: Matter.Body;

    attack (gameServer: GameServer): void {
        this.state |= EntityState.Attack;

        const range = this.inventory.equippedItem.range || 60;
        const angle = Utils.binaryAngleToRadians(this.angle);
        const vector = Utils.translateVector(this.body.position, angle, range * 1.1);
        this.attackBox = Matter.Bodies.rectangle(vector.x, vector.y, range, 50, {
            isSensor: true,
            angle,
            label: "attackBox",
        });
        Matter.World.add(gameServer.engine.world, this.attackBox);

        this.action = true;
    }

    get entityData (): number[] {
        return [
            this.inventory.equippedItem.id + this.inventory.equippedHelmet.id % 2 * 128,
            this.inventory.equippedHelmet.id / 2,
        ];
    }

    sendPackets: boolean = true;
    stats: Stats;

    get temperature () {
        return this.stats[StatType.Temperature];
    }

    set temperature (value: number) {
        this.setStat(StatType.Temperature, value);
    }

    get water () {
        return this.stats[StatType.Water];
    }

    set water (value: number) {
        this.setStat(StatType.Water, value);
    }

    get hunger () {
        return this.stats[StatType.Hunger];
    }

    set hunger (value: number) {
        this.setStat(StatType.Hunger, value);
    }

    get health () {
        return this.stats[StatType.Health];
    }

    set health (value: number) {
        if (this.stats)
            this.setStat(StatType.Health, value);
    }

    get oxygen () {
        return this.stats[StatType.Oxygen];
    }

    set oxygen (value: number) {
        this.setStat(StatType.Oxygen, value);
    }

    get overheat () {
        return this.stats[StatType.Overheat];
    }

    set overheat (value: number) {
        this.setStat(StatType.Overheat, value);
    }

    dealDamage (value: number, damager: Entity | undefined, damageReason: KillReason = KillReason.None) {
        this.setStat(StatType.Health, this.health - value, damager, damageReason);
    }

    setStat (stat: StatType, value: number, damager: Entity | undefined = undefined, damageReason: KillReason = KillReason.None) {
        if (damageReason == KillReason.None) {
            switch (stat) {
                case StatType.Health:
                    damageReason = KillReason.OtherPlayer;
                    break;
                case StatType.Hunger:
                    damageReason = KillReason.Starve;
                    break;
                case StatType.Temperature:
                    damageReason = KillReason.Cold;
                    break;
                case StatType.Water:
                    damageReason = KillReason.Thirst;
                    break;
                case StatType.Overheat:
                    damageReason = KillReason.Heat;
                    break;
            }
        }

        var max = stat === StatType.Health ? 200 : 100;
        this.stats[stat] = value;
        if (this.stats[stat] >= max) {
            this.stats[stat] = max;
            switch (stat) {
                case StatType.Temperature:
                    this.setStat(StatType.Overheat, this.overheat - 2, damager, damageReason);
                    break;
            }
        }
        if (this.stats[stat] <= 0) {
            this.stats[stat] = 0;
            if (stat === StatType.Health) {
                Utils.sendPacket(this.ws, new KillPacket(damageReason, this.kills, this.points));
                this.gameServer.deleteEntity(this);

                if (damager instanceof Player) {
                    damager.kills++;
                    damager.points++;
                }
            } else {
                switch (stat) {
                    case StatType.Hunger:
                        this.dealDamage(15, damager, damageReason);
                        break;
                    case StatType.Temperature:
                    case StatType.Water:
                    case StatType.Oxygen:
                        this.dealDamage(10, damager, damageReason);
                        break;
                    case StatType.Overheat:
                        this.dealDamage(12, damager, damageReason);
                        break;
                }
            }
        } else if (this.sendPackets) {
            Utils.sendPacket(this.ws, new SetStatPacket(stat, stat == StatType.Health ? this.getBinaryHealth() : this.stats[stat]));
        }
    }

    asLeaderBoard (): object {
        const jsonConvert: JsonConvert = new JsonConvert();
        return {...jsonConvert.serialize(this), ...jsonConvert.serialize(this.skin)};
    }

    sendLeaderboard (gameServer: GameServer): void {
        Utils.sendPacket(this.ws, new LeaderboardPacket(this, gameServer.players));
        //console.log(gameServer.players);
    }

    sendMessage (message: string, player: Player = this): void {
        Utils.sendPacket(this.ws, new SendChatPacket(player.id, message));
        console.log(`${this.nickname}: ${message}`)
    }

    public toString = (): string => {
        return `${this.nickname} (${this.id})`;
    }
    ''

    constructor (gameServer: GameServer, handshake: HandshakePacket, ws: any) {
        super(gameServer, EntityType.list[0]);

        this.nickname = handshake.nickname;
        this.skin = handshake.skin;
        this.ws = ws;

        this.width = Math.min(handshake.width, 3840 + 200);
        this.height = Math.min(handshake.height, 2160 + 200);
        this.stats = {};
        for (const stat of $enum(StatType).getValues()) {
            this.stats[stat] = 100;
        }
        this.stats[StatType.Health] = this.type.health;
    }
}

export class PlayerSkin {
    @JsonProperty("s")
    skinId: number;

    @JsonProperty("a")
    accessoryId: number;

    @JsonProperty("c")
    bagId: number;

    @JsonProperty("b")
    bookId: number;

    @JsonProperty("d")
    deadBox: number;

    @JsonProperty("g")
    lootBox: number;

    constructor (skinId: number, accessoryId: number, bagId: number, bookId: number, lootBox: number, deadBox: number) {
        this.skinId = skinId;
        this.accessoryId = accessoryId;
        this.bagId = bagId;
        this.bookId = bookId;
        this.lootBox = lootBox;
        this.deadBox = deadBox;
    }
}
