import { Command, MetaType } from './CommandManager';
import { ItemStack } from '../entity/Item';
import Player from '../entity/Player';
import 'reflect-metadata';
import GameServer from '../GameServer';
import Matter from 'matter-js';
import ICommandSource from './ICommandSource';
import * as config from "../data/config.json";
import { ConsoleSource } from './ICommandSource';
import Entity from '../entity/Entity';
import EntityType from '../entity/EntityType';
import Utils from '../Utils';

export default class AdminCommands {
    @Command("list")
    list(source: ICommandSource, gameServer: GameServer) {
        source.sendMessage(`Current players on server (${gameServer.players.length}/${config.maxPlayers}): ${gameServer.players.map(x => `${x.nickname} (${x.id})`).join(", ")}`);
    }

    @Command("alert")
    alert(gameServer: GameServer, console: ConsoleSource, message: string) {
        message = "ALERT: " + message;
        for (const player of gameServer.players) {
            player.sendMessage(message);
        }
        console.sendMessage(message);
    }

    @Command("give")
    give(source: ICommandSource, @MetaType(Player) players: Player[], @MetaType(ItemStack) items: ItemStack[]) {
        if (players.length > 0 && items.length > 0) {
            for (const target of players) {
                target.inventory.addItem(items);
            }

            source.sendMessage("Given items to " + players.map(x => x.nickname).join(", "));
        }
    }

    @Command("place")
    place(player: Player, gameServer: GameServer, entityTypeId: number, data1: number, data2: number) {
        let entity = new Entity(gameServer, new EntityType(entityTypeId));
        entity.owner = player;
        entity.angle = player.angle;
        entity.entityData = [data1, data2];
        gameServer.addEntity(entity, Utils.translateVector(player.body.position, Utils.binaryAngleToRadians(player.angle)));
    }

    @Command("clear")
    clear(source: ICommandSource, @MetaType(Player) players: Player[]) {
        if (players.length > 0) {
            for (const target of players) {
                target.inventory.removeItems(target.inventory.items);
            }

            source.sendMessage("Cleared " + players.map(x => x.nickname).join(", ") + " items");
        }
    }

    @Command("tp")
    teleportToCords(source: ICommandSource, @MetaType(Player) players: Player[], x: number, y: number, gameServer: GameServer) {
        if (players.length > 0) {
            const newX = (x * 100).clamp(gameServer.map.mapBounds.min.x, gameServer.map.mapBounds.max.x - 1);
            const newY = (y * 100).clamp(gameServer.map.mapBounds.min.y, gameServer.map.mapBounds.max.y - 1);

            for (const target of players) {
                Matter.Body.setPosition(target.body, { newX, newY });
            }

            source.sendMessage("Teleported " + players.map(x => x.nickname).join(", "));
        }
    }

    @Command("tp")
    teleportToPlayer(source: ICommandSource, @MetaType(Player) players: Player[], destination: Player) {
        if (players.length > 0 && destination) {
            for (const target of players) {
                Matter.Body.setPosition(target.body, destination.body.position);
            }

            source.sendMessage("Teleported " + players.map(x => x.nickname).join(", ") + " to " + destination.nickname);
        }
    }

    @Command("eval")
    eval(source: ICommandSource, gameServer: GameServer, code: string) {
        try {
            // Don't use eval!!! It's really unsafe and people can wreak havoc on your code
            const result = eval(code);
            source.sendMessage(result == undefined ? "Evaluated" : result);
        } catch (error) {
            source.sendMessage(error.toString());
        }
    }
}
