"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDegreePrograms = exports.getDegreeProgram = exports.getMajor = void 0;
var jsdom_1 = require("jsdom");
var path_1 = require("path");
var promises_1 = require("fs/promises");
var DEGREE_PROGRAMS_URL = "https://guide.berkeley.edu/undergraduate/degree-programs/";
var DEGREE_PROGRAMS_PATH = (0, path_1.join)("out", "degree-programs.json");
var MAJOR_SELECTOR = "#majorrequirementstextcontainer";
var getTitle = function (element) {
    var _a;
    var previousSibling = element.previousElementSibling;
    while (previousSibling && previousSibling.tagName !== "H3") {
        previousSibling = previousSibling.previousElementSibling;
    }
    if (!previousSibling)
        return;
    return (_a = previousSibling.textContent) === null || _a === void 0 ? void 0 : _a.trim();
};
var parseTable = function (table) {
    var _a;
    var groups = [];
    var currentGroup = null;
    var rows = Array.from(table.querySelectorAll("tbody tr"));
    if (rows.length === 0)
        return groups;
    var _loop_1 = function (row) {
        // A new group started
        var title = row.querySelector("span.courselistcomment");
        if (title) {
            var group_1 = {
                title: (_a = title.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                requirements: [],
            };
            groups.push(group_1);
            currentGroup = group_1;
            return "continue";
        }
        var root = row.querySelector("td.codecol");
        if (!root)
            return "continue";
        // A new requirement started
        var links = root.querySelectorAll("a.bubblelink");
        if (!links.length)
            return "continue";
        var courses = Array.from(links).map(function (link) {
            return link.text.replace(/\u00a0/g, " ");
        });
        var initialSubject = courses[0].split(" ").slice(0, -1).join(" ");
        var parsedCourses = courses.map(function (course) {
            var items = course.split(" ");
            if (items.length === 1) {
                return {
                    subject: initialSubject,
                    number: course,
                };
            }
            var number = items.slice(-1)[0];
            var subject = items.slice(0, -1).join(" ");
            return {
                subject: subject,
                number: number,
            };
        });
        var requirement = parsedCourses.length === 1
            ? {
                type: "course",
                data: parsedCourses[0],
            }
            : {
                type: "operator",
                data: {
                    operator: "and",
                    children: parsedCourses.map(function (course) { return ({
                        type: "course",
                        data: course,
                    }); }),
                },
            };
        // Add the requirement as the child of a new or existing operator
        var or = row.classList.contains("orclass");
        if (or) {
            var previousRequirement = currentGroup === null || currentGroup === void 0 ? void 0 : currentGroup.requirements.pop();
            if (!previousRequirement)
                return "continue";
            // Add the requirement to the previous operator
            if (previousRequirement.type === "operator" &&
                previousRequirement.data.operator === "or") {
                previousRequirement.data.children.push(requirement);
                currentGroup.requirements.push(previousRequirement);
                return "continue";
            }
            // Create a new operator
            var parentRequirement = {
                type: "operator",
                data: {
                    operator: "or",
                    children: [previousRequirement, requirement],
                },
            };
            currentGroup.requirements.push(parentRequirement);
            return "continue";
        }
        // Add the requirement to the current group
        if (currentGroup) {
            currentGroup.requirements.push(requirement);
            return "continue";
        }
        // Create a new group
        var group = {
            requirements: [requirement],
        };
        groups.push(group);
        currentGroup = group;
    };
    for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
        var row = rows_1[_i];
        _loop_1(row);
    }
    return {
        title: getTitle(table),
        groups: groups,
    };
};
var getMajor = function (degreeProgram) { return __awaiter(void 0, void 0, void 0, function () {
    var url, response, text, document, root, tables, sections;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                url = "".concat(DEGREE_PROGRAMS_URL).concat(degreeProgram, "/");
                return [4 /*yield*/, fetch(url)];
            case 1:
                response = _a.sent();
                return [4 /*yield*/, response.text()];
            case 2:
                text = _a.sent();
                document = new jsdom_1.JSDOM(text, {
                    url: url,
                }).window.document;
                root = document.querySelector(MAJOR_SELECTOR);
                if (!root)
                    return [2 /*return*/, []];
                tables = root.querySelectorAll("table.sc_courselist");
                sections = Array.from(tables).map(function (table) { return parseTable(table); });
                return [2 /*return*/, sections];
        }
    });
}); };
exports.getMajor = getMajor;
var getDegreeProgram = function (degreeProgram) { return __awaiter(void 0, void 0, void 0, function () {
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = {
                    identifier: degreeProgram
                };
                return [4 /*yield*/, (0, exports.getMajor)(degreeProgram)];
            case 1: return [2 /*return*/, (_a.major = _b.sent(),
                    _a)];
        }
    });
}); };
exports.getDegreeProgram = getDegreeProgram;
var getDegreePrograms = function () { return __awaiter(void 0, void 0, void 0, function () {
    var text_1, _a, response, text, document, nodes, degreePrograms;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                return [4 /*yield*/, (0, promises_1.readFile)(DEGREE_PROGRAMS_PATH, "utf-8")];
            case 1:
                text_1 = _b.sent();
                return [2 /*return*/, JSON.parse(text_1)];
            case 2:
                _a = _b.sent();
                console.log("Degree programs not saved. Scraping...");
                return [3 /*break*/, 3];
            case 3: return [4 /*yield*/, fetch(DEGREE_PROGRAMS_URL)];
            case 4:
                response = _b.sent();
                return [4 /*yield*/, response.text()];
            case 5:
                text = _b.sent();
                document = new jsdom_1.JSDOM(text, {
                    url: DEGREE_PROGRAMS_URL,
                }).window.document;
                nodes = document.querySelectorAll("li.program a.pview");
                degreePrograms = Array.from(nodes).map(function (node) {
                    return node.href.slice(DEGREE_PROGRAMS_URL.length);
                });
                return [4 /*yield*/, (0, promises_1.writeFile)(DEGREE_PROGRAMS_PATH, JSON.stringify(degreePrograms))];
            case 6:
                _b.sent();
                console.log("".concat(degreePrograms.length, " degree programs scraped and saved."));
                return [2 /*return*/, degreePrograms];
        }
    });
}); };
exports.getDegreePrograms = getDegreePrograms;
var initialize = function () { return __awaiter(void 0, void 0, void 0, function () {
    var degreePrograms, degreeProgram, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0: return [4 /*yield*/, (0, exports.getDegreePrograms)()];
            case 1:
                degreePrograms = _c.sent();
                degreeProgram = degreePrograms[Math.floor(Math.random() * degreePrograms.length)];
                _b = (_a = console).dir;
                return [4 /*yield*/, (0, exports.getDegreeProgram)(degreeProgram)];
            case 2:
                _b.apply(_a, [_c.sent(), { depth: null }]);
                return [2 /*return*/];
        }
    });
}); };
initialize();
// TODO: Some courses are listed as {subject} {number}/{number} (e.g. "MATH 1A/1B") or {subject} {number}/{subject} {number} (e.g. "MATH 1A/STAT 20A"). These should be split into separate courses.
// TODO: Try creating detailed AST examples and feeding HTML into Claude or GPT to generate the ASTs
