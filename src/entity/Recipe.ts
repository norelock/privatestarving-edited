import { JsonProperty } from "json2typescript";
export default class Recipe {
    @JsonProperty("r")
    ingredients: number[][] = [];

    @JsonProperty("w")
    workbench: number = 0;

    @JsonProperty("f")
    fire: number = 0;

    @JsonProperty("PB")
    water: number = 0;

    @JsonProperty()
    e: number = 0;

    @JsonProperty()
    id: number = 0;

    @JsonProperty("Py")
    result: number = 0;

    @JsonProperty()
    time: number = 0;

    @JsonProperty()
    wy: number = 0;

    static list: Recipe[] = [];
}