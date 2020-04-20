import { JsonProperty, JsonConverter, JsonCustomConvert } from 'json2typescript';
import Matter from 'matter-js';
import { SourceConverter, Source } from './EntityType';

@JsonConverter
class JsonParseConverter<T> implements JsonCustomConvert<T> {
    serialize(json: T): any {
        return JSON.stringify(json);
    }
    deserialize(json: any): T {
        return JSON.parse(json);
    }
}

export class MapEntity implements Matter.Vector {
    x: number;
    y: number;
    typeId: string;
    type: MapEntityType;
    body: Matter.Body;
    nulls: number;
}

export class MapEntityType {
    @JsonProperty("Id")
    id: string = "";

    @JsonProperty("Name")
    name: string = "";

    @JsonProperty("Collision")
    collision: string = "";

    @JsonProperty("Sizes", JsonParseConverter)
    sizes: string[] = [];

    @JsonProperty("Number")
    number: number = 0;

    @JsonProperty("Item Id")
    itemId: number = 0;

    @JsonProperty("Tier")
    tier: number = 0;

    @JsonProperty("Source", SourceConverter)
    source: Source = Source.None;

    @JsonProperty("Type")
    type: string = "";

    static list: MapEntityType[] = [];
}