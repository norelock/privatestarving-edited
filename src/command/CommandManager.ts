import 'reflect-metadata';
import { readdir } from 'fs';
import { promisify } from 'util';
import * as path from 'path';
import Player from '../entity/Player';
import Item from '../entity/Item';
import GameServer from '../GameServer';
import '../Utils';
import { ItemStack } from '../entity/Item';
import levenshtein from 'js-levenshtein';
import * as readline from 'readline';
import ICommandSource from './ICommandSource';
import { ConsoleSource } from './ICommandSource';

export function Command(name: string) {
    return function (target: object, propertyKey: string | symbol) {
        CommandManager.commands.push({ name, function: target[propertyKey], args: Reflect.getMetadata("design:paramtypes", target, propertyKey) || [] });
    }
}

export function MetaType(type: Function | "source") {
    return function (target: Object, propertyKey: string | symbol, parameterIndex: number) {
        Reflect.defineMetadata(parameterIndex, type, target[propertyKey]);
    }
}

interface ICommand {
    name: string;
    function: Function;
    args: any[];
}

export default class CommandManager {
    static commands: ICommand[] = [];

    prefix: string = "/";
    gameServer: GameServer;

    constructor(gameServer: GameServer) {
        this.gameServer = gameServer;
    }

    async loadCommands(dir: string = __dirname) {
        for (const file of await promisify(readdir)(dir)) {
            if (file != path.parse(__filename).base) {
                await import(path.join(dir, file));
            }
        }
    }

    findItem(queries: string, source: ICommandSource | undefined = undefined): ItemStack[] {
        let items: ItemStack[] = [];
        for (const [query, amountString] of queries.split(';').map(x => x.split(':'))) {
            let amount = 1;
            if (amountString) {
                amount = Number.parseInt(amountString);
                if (!amount) {
                    if (source) {
                        source.sendMessage("Invalid amount: " + amountString);
                    }
                    continue;
                }
            }

            const id = Number.parseInt(query);
            if (id !== undefined) {
                const target = Item.list.findId(id);
                if (target) {
                    items.push(new ItemStack(target, amount));
                    continue;
                }
            }

            const lowerCase = query.toLowerCase();
            const target = Item.list.sort((a, b) => levenshtein(a.name.toLowerCase(), lowerCase) - levenshtein(b.name.toLowerCase(), lowerCase))[0];
            if (target) {
                items.push(new ItemStack(target, amount));
                continue;
            }

            if (source) {
                source.sendMessage("Cannot find item " + query);
            }
        }
        return items;
    }

    findPlayer(queries: string, source: ICommandSource | undefined = undefined): Player[] {
        const players: Player[] = [];
        for (const query of queries.split(';')) {
            if (query === "*") {
                players.push(...this.gameServer.players);
                continue;
            } else if (source instanceof Player) {
                if (query === "^*") {
                    players.push(...this.gameServer.players.filter(x => x != source));
                    continue;
                } else if (query === "^") {
                    players.push(source);
                    continue;
                }
            }

            const id = Number.parseInt(query);
            if (id) {
                const target = this.gameServer.players.findId(id);
                if (target) {
                    players.push(target);
                    continue;
                }
            }

            const target = this.gameServer.players.find(x => x.nickname.startsWith(query));
            if (target) {
                players.push(target);
                continue;
            }

            if (source) {
                source.sendMessage("Cannot find player " + query);
            }
        }
        return players;
    }

    consoleInput() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.on('line', (input) => {
            this.handleCommand(new ConsoleSource(), input.split(" "));
        });
    }

    handleCommand(source: ICommandSource, args: string[]): boolean {
        if (args[0].startsWith(this.prefix)) {
            let error = "Unknown command!";
            for (const command of CommandManager.commands) {
                if (this.prefix + command.name === args[0]) {
                    const cmdArgs: any[] = new Array(command.args.length);
                    let index = 1;
                    for (const [i, arg] of command.args.entries()) {
                        switch (arg) {
                            case Object:
                                cmdArgs[i] = source;
                                break;
                            case ConsoleSource:
                                cmdArgs[i] = new ConsoleSource();
                                break;
                            case Player:
                                if (i === 0) {
                                    if (!(source instanceof Player)) {
                                        error = "Console can't execute this command";
                                    }
                                    cmdArgs[i] = source;
                                } else {
                                    if (args[index]) {
                                        cmdArgs[i] = this.findPlayer(args[index], source)[0];
                                        index++;
                                    }
                                }
                                break;
                            case GameServer:
                                cmdArgs[i] = this.gameServer;
                                break;
                            case CommandManager:
                                cmdArgs[i] = this;
                                break;
                            case Number:
                                cmdArgs[i] = Number.parseFloat(args[index]);
                                index++;
                                break;
                            case String:
                                let string = args[index];
                                if (i === cmdArgs.length - 1) {
                                    string += " " + args.slice(index + 1).join(" ");
                                }
                                cmdArgs[i] = string;
                                index++;
                                break;
                            case Array:
                                if (args[index]) {
                                    const type = Reflect.getMetadata(i, command.function);
                                    switch (type) {
                                        case Player:
                                            cmdArgs[i] = this.findPlayer(args[index], source);
                                            break;
                                        case ItemStack:
                                            cmdArgs[i] = this.findItem(args[index], source);
                                            break;
                                    }
                                    index++;
                                }
                                break;
                        }
                    }

                    const cmdArgsLength = cmdArgs.filter(x => x != undefined && !Number.isNaN(x)).length;
                    if (cmdArgsLength == command.args.length) {
                        command.function(...cmdArgs);
                        return true;
                    } else {
                        error = `Wrong arguments`;
                    }
                }
            }

            source.sendMessage(error);
            return true;
        }
        return false;
    }
}
