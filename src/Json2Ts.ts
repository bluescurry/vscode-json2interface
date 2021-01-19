import * as _ from "underscore";

/** 注释对象集合 */
export type Command = {
    [propName: string]: string
};

export class Json2Ts {
    convert(content: string, command: Command = {}): string {
        let jsonContent = JSON.parse(content);

        if (_.isArray(jsonContent)) {
            return this.convertObjectToTsInterfaces(jsonContent[0], command);
        }

        return this.convertObjectToTsInterfaces(jsonContent, command);
    }

    private convertObjectToTsInterfaces(jsonContent: any, command: Command = {}, objectName: string = "RootObject"): string {
        let optionalKeys: string[] = [];
        let objectResult: string[] = [];

        for (let key in jsonContent) {
            let value = jsonContent[key];

            if (_.isObject(value) && !_.isArray(value)) {
                let childObjectName = this.toUpperFirstLetter(key);
                objectResult.push(this.convertObjectToTsInterfaces(value, command, childObjectName));
                jsonContent[key] = this.removeMajority(childObjectName) + ";";
            } else if (_.isArray(value)) {
                let arrayTypes: any = this.detectMultiArrayTypes(value);

                if (this.isMultiArray(arrayTypes)) {
                    let multiArrayBrackets = this.getMultiArrayBrackets(value);

                    if (this.isAllEqual(arrayTypes)) {
                        jsonContent[key] = arrayTypes[0].replace("[]", multiArrayBrackets);
                    } else {
                        jsonContent[key] = "any" + multiArrayBrackets + ";";
                    }
                } else if (value.length > 0 && _.isObject(value[0])) {
                    let childObjectName = this.toUpperFirstLetter(key);
                    objectResult.push(this.convertObjectToTsInterfaces(value[0], command, childObjectName));
                    jsonContent[key] = this.removeMajority(childObjectName) + "[];";
                } else {
                    jsonContent[key] = arrayTypes[0];
                }

            } else if (_.isDate(value)) {
                jsonContent[key] = "Date;";
            } else if (_.isString(value)) {
                jsonContent[key] = "string;";
            } else if (_.isBoolean(value)) {
                jsonContent[key] = "boolean;";
            } else if (_.isNumber(value)) {
                jsonContent[key] = "number;";
            } else {
                jsonContent[key] = "any;";
                optionalKeys.push(key);
            }
        }

        let result = this.formatCharsToTypeScript(jsonContent, objectName, optionalKeys, command);
        objectResult.push(result);

        return objectResult.join("\n\n");
    }

    private detectMultiArrayTypes(value: any, valueType: string[] = []): string[] {
        if (_.isArray(value)) {
            if (value.length === 0) {
                valueType.push("any[];");
            } else if (_.isArray(value[0])) {
                for (let index = 0, length = value.length; index < length; index++) {
                    let element = value[index];

                    let valueTypeResult = this.detectMultiArrayTypes(element, valueType);
                    valueType.concat(valueTypeResult);
                }
            } else if (_.all(value, _.isString)) {
                valueType.push("string[];");
            } else if (_.all(value, _.isNumber)) {
                valueType.push("number[];");
            } else if (_.all(value, _.isBoolean)) {
                valueType.push("boolean[];");
            } else {
                valueType.push("any[];");
            }
        }

        return valueType;
    }

    private isMultiArray(arrayTypes: string[]) {
        return arrayTypes.length > 1;
    }

    private isAllEqual(array: string[]) {
        return _.all(array.slice(1), _.partial(_.isEqual, array[0]));
    }

    private getMultiArrayBrackets(content: any): string {
        let jsonString = JSON.stringify(content);
        let brackets = "";

        for (let index = 0, length = jsonString.length; index < length; index++) {
            let element = jsonString[index];

            if (element === "[") {
                brackets = brackets + "[]";
            } else {
                index = length;
            }
        }

        return brackets;
    }

    private formatCharsToTypeScript(jsonContent: any, objectName: string, optionalKeys: string[], command?: Command): string {
        let result = JSON.stringify(jsonContent, null, "\t")
            .replace(new RegExp("\"", "g"), "")
            .replace(new RegExp(",", "g"), "");

        let allKeys = _.allKeys(jsonContent);
        for (let index = 0, length = allKeys.length; index < length; index++) {
            let key = allKeys[index];
            let commandStr = '';

            if (command && command[key]) {
                commandStr = `/** ${command[key]} */\r\t`;
            }

            if (_.contains(optionalKeys, key)) {
                result = result.replace(new RegExp(key + ":", "g"), commandStr + this.toLowerFirstLetter(key) + "?:");
            } else {
                result = result.replace(new RegExp(key + ":", "g"), commandStr + this.toLowerFirstLetter(key) + ":");
            }
        }

        objectName = this.removeMajority(objectName);

        return "export type " + objectName + " = " + result  + ";";
    }

    private removeMajority(objectName: string): string {
        if (_.last(objectName, 3).join("").toUpperCase() === "IES") {
            return objectName.substring(0, objectName.length - 3) + "y";
        } else if (_.last(objectName)?.toUpperCase() === "S") {
            return objectName.substring(0, objectName.length - 1);
        }

        return objectName;
    }

    private toUpperFirstLetter(text: string) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    };

    private toLowerFirstLetter(text: string) {
        return text.charAt(0).toLowerCase() + text.slice(1);
    };
}

export function isJson(stringContent: string) {
    try {
        JSON.parse(stringContent);
    } catch (e) {
        return false;
    }
    return true;
}

/** 去掉字段名中的引号和空格 */
function processField(field: string) {
    return field.replace(/['"]/g, '').trim();
}

/** 从 content 中提取出注释 */
export function filterComment(content: string) {

    var matchArr = content.match(/["']?(.*)["']?:.*(?<=\/\/)(.*)/g);

    // key 是 字段名，value 是注释
    var commandObj: Command = {};

    if (matchArr && matchArr?.length > 0) {
        matchArr.forEach(str => {
            const res = str.match(/["']?(.*)["']?:\s.*(?<=\/\/\s?)(.*)/);
            if (res && res.length >= 3) {
                commandObj[processField(res[1])] = res[2].trim();
            }
        });
    }

    return commandObj;
}
