export class JsonRepair {
    static findJsonPositions(text: any) {
        let openBrackets = 0;
        let startIndex = -1;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (openBrackets === 0) {
                    startIndex = i;
                }
                openBrackets++;
            } else if (text[i] === '}') {
                openBrackets--;
                if (openBrackets === 0) {
                    return [startIndex, i + 1];
                }
            }
        }
        return [-1, -1];
    }

    static extractJsonString(text: any) {
        const [start, end] = JsonRepair.findJsonPositions(text);
        if (start === -1 || end === -1) {
            return '';
        }
        return text.substring(start, end);
    }

    static repairJsonString(jsonString: any) {
        jsonString = jsonString.replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
        jsonString = jsonString.replace(/"([^"]*?)"(?=\s*:\s*"[^"]*?")/g, (match: any) => {
            return '"' + match.substring(1, match.length - 1).replace(/"/g, '\\"') + '"';
        });

        return jsonString;
    }

    static parseJsonSafely(text: any) {
        const newJson = JsonRepair.repairJsonString((text || '{}')
            .replace(/\n/g, '')  // Replace newlines with escaped newlines
            .replace(/\r/g, '\\r')  // Replace carriage returns with escaped carriage returns
            .replace(/\t/g, '\\t')  // Replace tabs with escaped tabs
            .replace(/\f/g, '\\f')  // Replace form feeds with escaped form feeds
            .replace(/[\b]/g, '\\b')  // Replace backspace with escaped backspace
            .replace(/&/g, '')
            .replace(/'/g, "\\'")  // Replace single quotes with escaped single quotes
            .replace(/&/g, '&amp;')
            .replace(/\\\'/g, "'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r'));
        return JSON.parse(newJson);
    }

    static recursivelyParseEmbeddedJson(obj: any) {
        if (typeof obj === 'object' && obj !== null) {
            for (let key in obj) {
                if (typeof obj[key] === 'string') {
                    try {
                        let innerJson = JsonRepair.extractJsonString(obj[key]);
                        innerJson = JsonRepair.repairJsonString(innerJson);
                        obj[key] = JsonRepair.recursivelyParseEmbeddedJson(JSON.parse(innerJson));
                    } catch (e) {
                        // Not a valid JSON string, skip parsing
                    }
                } else if (typeof obj[key] === 'object') {
                    obj[key] = JsonRepair.recursivelyParseEmbeddedJson(obj[key]);
                }
            }
        }
        return obj;
    }
}

const jsonrepair = (text: any) => JsonRepair.parseJsonSafely(text);
export default jsonrepair;