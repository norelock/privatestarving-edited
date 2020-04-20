import * as WebSocket from "ws";
import * as http from "http";
import { JsonConvert } from "json2typescript";
import ServerInfo from "./entity/ServerInfo";
import GameServer from "./GameServer";
import Utils from "./Utils";
import * as config from "./data/config.json";
import figlet from "figlet";
import { HandshakePacket, HandshakeResponse } from './packet/json/HandshakePacket';
import MovePacket from './packet/json/MovePacket';
import Player from './entity/Player';
import PlacePacket from './packet/json/PlacePacket';
import utils from "./Utils";
import { ChatPacket } from './packet/json/ChatPacket';
import EntityType from './entity/EntityType';
import Item from './entity/Item';
import { RemoveType } from './packet/binary/RemoveItemPacket';
import Recipe from "./entity/Recipe";
import { ItemStack } from './entity/Item';
import { CraftingStartPacket, CraftingEndPacket, CraftingCancelPacket } from './packet/binary/CraftingPacket';
import NewPlayerPacket from "./packet/json/NewPlayerPacket";
import MessagePacket from './packet/json/MessagePacket';
import { LocalizedMessage, LocalizedMessagePacket } from './packet/binary/LocalizedMessagePacket';
import { Source } from './entity/EntityType';
import ChestEntity from './entity/structure/ChestEntity';

const gameServer = new GameServer();
console.log(figlet.textSync("PrivateStarving"), "\n", `Starve.io version: ${gameServer.starveVersion}`);

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  if (!gameServer.initialized) {
    Utils.sendPacket(ws, new MessagePacket("Server is starting!"));
    ws.close();
    return;
  }

  if (gameServer.players.length >= config.maxPlayers) {
    Utils.sendPacket(ws, new LocalizedMessagePacket(LocalizedMessage.Full));
    ws.close();
    return;
  }

  var player = gameServer.findPlayerByWs(ws);
  ws.on('message', (message) => {
    try {
      if (typeof message == "string") {
        var json: any[] = JSON.parse(message);
        if (typeof json[0] == "string" && player == undefined) {
          var handshake = HandshakePacket.fromJson(json);

          if (handshake.clientVersion != gameServer.starveVersion) {
            Utils.sendPacket(ws, new MessagePacket(`You have too ${handshake.clientVersion > gameServer.starveVersion ? "new" : "old"} version!`));
            ws.close();
            return;
          }

          player = new Player(gameServer, handshake, ws);

          gameServer.addEntity(player, {x: 15255.34636925946, y: 13529.856929439708});

          Utils.sendPacket(ws, new HandshakeResponse(player, config.maxPlayers, gameServer.players, gameServer.night, gameServer.time, gameServer.map.seed));

          for (var otherPlayer of gameServer.players.filter(x => x != player)) {
            Utils.sendPacket(otherPlayer.ws, new NewPlayerPacket(player));
            otherPlayer.sendLeaderboard(gameServer);
          }

          let start = {
            spear: Item.list.findId(26),
            helm: Item.list.findId(102),
            sword: Item.list.findId(105)
          };

          if (start) {
            if (start.helm && start.sword && start.spear) {
              player.inventory.addItem([new ItemStack(start.helm, 1)]);
              player.inventory.addItem([new ItemStack(start.sword, 1)]);
              player.inventory.addItem([new ItemStack(start.spear, 1)]);

              if (player.inventory.containsItem(start.helm)) {
                player.inventory.equipItem(start.helm);
              }
            }
          }

          console.log(`${player} joined`)
        } else if (typeof json[0] == "number") {
          if (player) {
            switch (json[0]) {
              case 0:
                var chat = ChatPacket.fromJson(json);
                if (!gameServer.commandManager.handleCommand(player, chat.message.split(" "))) {
                  for (var otherPlayer of gameServer.players.filter(p => p != player)) {
                    otherPlayer.sendMessage(chat.message, player);
                  }
                }
              case 2:
                var move = MovePacket.fromJson(json);
                player.direction = move.direction;
                break;
              case 3:
                player.angle = json[1];
                player.action = true;
                break;
              case 4:
                if (player.crafting)
                  break;

                player.angle = json[1]
                if (!player.isAttacking) {
                  player.willAttack = true
                  player.isAttacking = true
                  player.attackInterval = setInterval(function () {
                    if (player) {
                      if (!player.willAttack) {
                        clearInterval(player.attackInterval);
                        player.isAttacking = false;
                        return;
                      }
                      player.attack(gameServer);
                    }
                  }, 560);
                  player.attack(gameServer);
                }
                break;
              case 8:
                var item = Item.list.findId(json[1]);
                var amount = json[2];
                var ownerId = json[3];
                var entityId = json[4];
                if (item && amount) {
                  let entity = gameServer.entities.find(x => x.id == entityId && x.owner && x.owner.id == ownerId);
                  if (entity && entity instanceof ChestEntity && player.inventory.containsItem(item, amount)) {
                    if (entity.inventory && entity.inventory.item == item) {
                      entity.inventory.amount += amount;
                    } else {
                      entity.inventory = new ItemStack(item, amount);
                    }
                    entity.action = true;
                    player.inventory.removeItem(item, RemoveType.Amount, amount);
                  }
                }
                break;
              case 9:
                var ownerId = json[1];
                var entityId = json[2];
                let entity = gameServer.entities.find(x => x.id == entityId && x.owner && x.owner.id == ownerId);
                if (entity && entity instanceof ChestEntity && entity.inventory) {
                  player.inventory.addItem([entity.inventory]);
                  entity.inventory = undefined;                  
                  entity.action = true;
                }
                break;
              case 14:
                player.willAttack = false;
              case 5:
                if (player.crafting)
                  break;

                var item = Item.list.findId(json[1]);
                if (item && player.inventory.containsItem(item)) {
                  player.inventory.equipItem(item);
                }
                break;
              case 6:
              case 28:
                if (player.crafting)
                  break;

                var item = Item.list.findId(json[1]);
                if (item) {
                  player.inventory.removeItem(item, json[0] == 6 ? RemoveType.All : RemoveType.Single);
                }
                break;
              case 7:
                if (player.crafting)
                  break;

                var recipe = Recipe.list.findId(json[1]);

                if (recipe && recipe.ingredients.every(function (ingredient) {
                  var item = Item.list.findId(ingredient[0]);
                  return item && player && player.inventory.containsItem(item, ingredient[1]);
                })) {
                  var result = Item.list.findId(recipe.result);

                  if (recipe.fire && !Utils.hasFlag(player.source, Source.Fire)) {
                    break;
                  }
                  if (recipe.water && !Utils.hasFlag(player.source, Source.Water)) {
                    break;
                  }
                  if (recipe.workbench && !Utils.hasFlag(player.source, Source.Workbench)) {
                    break;
                  }

                  player.crafting = true;
                  player.inventory.removeItems(recipe.ingredients.map(x => new ItemStack(Item.list.findId(x[0])!, x[1])));

                  Utils.sendPacket(ws, new CraftingStartPacket(recipe));
                  setTimeout(() => {
                    if (player && player.crafting && result && recipe) {
                      player.inventory.addItem([new ItemStack(result)], false);
                      Utils.sendPacket(ws, new CraftingEndPacket(recipe));
                      player.crafting = false;
                    }
                  }, 1000 / recipe.time);
                }
                break;
              case 31:
                player.crafting = false;
                Utils.sendPacket(ws, new CraftingCancelPacket());
                break;
              case 10:
                if (player.crafting)
                  break;

                var place = PlacePacket.fromJson(json);
                item = Item.list.findId(place.itemId);
                if (item != undefined) {
                  var entityType = EntityType.list.find(x => x.id == item!.structureId);
                  if (entityType && player.inventory.containsItem(item)) {
                    let entity = new entityType.class(gameServer, entityType);
                    entity.owner = player;
                    entity.angle = place.angle;
                    gameServer.addEntity(entity, utils.translateVector(player.body.position, utils.binaryAngleToRadians(place.angle)));
                    player.inventory.removeItem(item, RemoveType.Place);

                    if (config.debug.drawEntityCollisions) {
                      Utils.drawCollisions(entity.body, (x: number, y: number) => Utils.spawnCell(gameServer, x, y));
                    }
                  }
                }
                break;
              case 13:
              case 11:
              case 1:
                break;
              default:
                console.warn(`${player} sent unknown packet: ${json}`);
                break;
            }
          }
        }
      }
    } catch (error) {
      if (player) {
        player.sendMessage("Error occurred!")
        console.error(player);
      }
      console.error(error);
    }
  });

  ws.on('close', (code, reason) => {
    if (player) {
      console.log(player + ' disconnected');
      gameServer.deleteEntity(player);
      

      console.log(gameServer.players);
      gameServer.updateLeaderboard();
    } else {
      console.log('WebSocket disconnected');
    }

    if (code != 0 && code != 1005) {
      var error: string = "Empty reason";
      if (reason && reason.length > 0) {
        error += reason;
      }
      error += ` (${code})`;
      console.error(error);
    }
  });
});

server.on("request", (req: http.IncomingMessage, res: http.OutgoingMessage) => {
  if (req.url == "/info") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("content-type", "application/json");
    var jsonConvert: JsonConvert = new JsonConvert();
    res.end(JSON.stringify(jsonConvert.serialize(new ServerInfo(gameServer.players.length, config.maxPlayers, config.ip, config.port, config.name))));
  }
});

server.listen(config.port, () => {
  console.log("Listening to port " + config.port);
  gameServer.start();
});