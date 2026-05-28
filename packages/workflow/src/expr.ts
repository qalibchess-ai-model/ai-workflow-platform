type Token =
  | { type: "num"; value: number }
  | { type: "str"; value: string }
  | { type: "ident"; value: string }
  | { type: "punc"; value: string };

type Node =
  | { kind: "literal"; value: unknown }
  | { kind: "identifier"; name: string }
  | { kind: "member"; object: Node; property: string; computed: boolean }
  | { kind: "index"; object: Node; index: Node }
  | { kind: "unary"; op: "!" | "-"; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "logical"; op: "&&" | "||" | "??"; left: Node; right: Node }
  | { kind: "conditional"; test: Node; consequent: Node; alternate: Node };

const KEYWORDS: Record<string, unknown> = {
  true: true,
  false: false,
  null: null,
  undefined,
};

const PUNCT_3 = new Set(["===", "!==", "??="]);
const PUNCT_2 = new Set(["==", "!=", "<=", ">=", "&&", "||", "??", "**"]);
const PUNCT_1 = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "<",
  ">",
  "!",
  ".",
  "(",
  ")",
  "[",
  "]",
  ",",
  "?",
  ":",
]);

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionError";
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === undefined) break;
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let str = "";
      while (j < input.length && input[j] !== quote) {
        const c = input[j];
        if (c === "\\" && j + 1 < input.length) {
          const next = input[j + 1];
          if (next === "n") str += "\n";
          else if (next === "t") str += "\t";
          else if (next === "r") str += "\r";
          else if (next !== undefined) str += next;
          j += 2;
          continue;
        }
        if (c !== undefined) str += c;
        j++;
      }
      if (j >= input.length) throw new ExpressionError("Unterminated string");
      tokens.push({ type: "str", value: str });
      i = j + 1;
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      let j = i;
      while (j < input.length) {
        const c = input[j];
        if (c === undefined) break;
        if (!((c >= "0" && c <= "9") || c === ".")) break;
        j++;
      }
      const num = Number(input.slice(i, j));
      if (Number.isNaN(num)) throw new ExpressionError(`Invalid number at ${i}`);
      tokens.push({ type: "num", value: num });
      i = j;
      continue;
    }
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_" || ch === "$") {
      let j = i;
      while (j < input.length) {
        const c = input[j];
        if (c === undefined) break;
        if (
          !(
            (c >= "a" && c <= "z") ||
            (c >= "A" && c <= "Z") ||
            (c >= "0" && c <= "9") ||
            c === "_" ||
            c === "$"
          )
        )
          break;
        j++;
      }
      tokens.push({ type: "ident", value: input.slice(i, j) });
      i = j;
      continue;
    }
    const three = input.slice(i, i + 3);
    if (PUNCT_3.has(three)) {
      tokens.push({ type: "punc", value: three });
      i += 3;
      continue;
    }
    const two = input.slice(i, i + 2);
    if (PUNCT_2.has(two)) {
      tokens.push({ type: "punc", value: two });
      i += 2;
      continue;
    }
    if (PUNCT_1.has(ch)) {
      tokens.push({ type: "punc", value: ch });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected character '${ch}' at position ${i}`);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseTernary();
    if (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      throw new ExpressionError(`Unexpected trailing token: ${JSON.stringify(t)}`);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new ExpressionError("Unexpected end of expression");
    this.pos++;
    return t;
  }

  private matchPunc(value: string): boolean {
    const t = this.peek();
    if (t && t.type === "punc" && t.value === value) {
      this.pos++;
      return true;
    }
    return false;
  }

  private expectPunc(value: string): void {
    const t = this.consume();
    if (t.type !== "punc" || t.value !== value) {
      throw new ExpressionError(`Expected '${value}', got ${JSON.stringify(t)}`);
    }
  }

  private parseTernary(): Node {
    const test = this.parseLogicalOr();
    if (this.matchPunc("?")) {
      const consequent = this.parseTernary();
      this.expectPunc(":");
      const alternate = this.parseTernary();
      return { kind: "conditional", test, consequent, alternate };
    }
    return test;
  }

  private parseLogicalOr(): Node {
    let left = this.parseLogicalAnd();
    let next = this.peek();
    while (next && next.type === "punc" && (next.value === "||" || next.value === "??")) {
      this.consume();
      const right = this.parseLogicalAnd();
      left = { kind: "logical", op: next.value, left, right };
      next = this.peek();
    }
    return left;
  }

  private parseLogicalAnd(): Node {
    let left = this.parseEquality();
    while (this.peekPunc("&&")) {
      this.consume();
      const right = this.parseEquality();
      left = { kind: "logical", op: "&&", left, right };
    }
    return left;
  }

  private peekPunc(value: string): boolean {
    const t = this.peek();
    return Boolean(t && t.type === "punc" && t.value === value);
  }

  private parseEquality(): Node {
    let left = this.parseRelational();
    let next = this.peek();
    while (
      next &&
      next.type === "punc" &&
      (next.value === "==" || next.value === "!=" || next.value === "===" || next.value === "!==")
    ) {
      this.consume();
      const right = this.parseRelational();
      left = { kind: "binary", op: next.value, left, right };
      next = this.peek();
    }
    return left;
  }

  private parseRelational(): Node {
    let left = this.parseAdditive();
    let next = this.peek();
    while (
      next &&
      next.type === "punc" &&
      (next.value === "<" || next.value === ">" || next.value === "<=" || next.value === ">=")
    ) {
      this.consume();
      const right = this.parseAdditive();
      left = { kind: "binary", op: next.value, left, right };
      next = this.peek();
    }
    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    let next = this.peek();
    while (next && next.type === "punc" && (next.value === "+" || next.value === "-")) {
      this.consume();
      const right = this.parseMultiplicative();
      left = { kind: "binary", op: next.value, left, right };
      next = this.peek();
    }
    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary();
    let next = this.peek();
    while (
      next &&
      next.type === "punc" &&
      (next.value === "*" || next.value === "/" || next.value === "%")
    ) {
      this.consume();
      const right = this.parseUnary();
      left = { kind: "binary", op: next.value, left, right };
      next = this.peek();
    }
    return left;
  }

  private parseUnary(): Node {
    const t = this.peek();
    if (t && t.type === "punc" && (t.value === "!" || t.value === "-")) {
      this.consume();
      const arg = this.parseUnary();
      return { kind: "unary", op: t.value, arg };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): Node {
    let node = this.parsePrimary();
    while (this.peekPunc(".") || this.peekPunc("[")) {
      if (this.matchPunc(".")) {
        const id = this.consume();
        if (id.type !== "ident") {
          throw new ExpressionError("Expected identifier after '.'");
        }
        node = { kind: "member", object: node, property: id.value, computed: false };
      } else {
        this.consume();
        const index = this.parseTernary();
        this.expectPunc("]");
        node = { kind: "index", object: node, index };
      }
    }
    return node;
  }

  private parsePrimary(): Node {
    const t = this.consume();
    if (t.type === "num") return { kind: "literal", value: t.value };
    if (t.type === "str") return { kind: "literal", value: t.value };
    if (t.type === "ident") {
      if (t.value in KEYWORDS) {
        return { kind: "literal", value: KEYWORDS[t.value] };
      }
      return { kind: "identifier", name: t.value };
    }
    if (t.type === "punc" && t.value === "(") {
      const inner = this.parseTernary();
      this.expectPunc(")");
      return inner;
    }
    throw new ExpressionError(`Unexpected token ${JSON.stringify(t)}`);
  }
}

function getProperty(obj: unknown, key: string | number): unknown {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== "object") {
    if (typeof obj === "string" && key === "length") return obj.length;
    return undefined;
  }
  const k = String(key);
  if (k === "__proto__" || k === "constructor" || k === "prototype") {
    throw new ExpressionError(`Access to '${k}' is not allowed`);
  }
  if (Array.isArray(obj)) {
    if (k === "length") return obj.length;
    const idx = Number(k);
    if (Number.isInteger(idx)) return obj[idx];
    return undefined;
  }
  const record = obj as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, k)) return undefined;
  return record[k];
}

function evalNode(node: Node, scope: Record<string, unknown>): unknown {
  switch (node.kind) {
    case "literal":
      return node.value;
    case "identifier":
      if (!Object.prototype.hasOwnProperty.call(scope, node.name)) {
        throw new ExpressionError(`Undefined variable: ${node.name}`);
      }
      return scope[node.name];
    case "member":
      return getProperty(evalNode(node.object, scope), node.property);
    case "index": {
      const idx = evalNode(node.index, scope);
      if (typeof idx !== "string" && typeof idx !== "number") {
        throw new ExpressionError("Index must be string or number");
      }
      return getProperty(evalNode(node.object, scope), idx);
    }
    case "unary": {
      const v = evalNode(node.arg, scope);
      if (node.op === "!") return !v;
      if (typeof v !== "number") {
        throw new ExpressionError("Unary '-' requires a number");
      }
      return -v;
    }
    case "logical": {
      const l = evalNode(node.left, scope);
      if (node.op === "&&") return l ? evalNode(node.right, scope) : l;
      if (node.op === "||") return l ? l : evalNode(node.right, scope);
      return l === null || l === undefined ? evalNode(node.right, scope) : l;
    }
    case "binary": {
      const l = evalNode(node.left, scope);
      const r = evalNode(node.right, scope);
      switch (node.op) {
        case "+":
          if (typeof l === "string" || typeof r === "string") return String(l) + String(r);
          return (l as number) + (r as number);
        case "-":
          return (l as number) - (r as number);
        case "*":
          return (l as number) * (r as number);
        case "/":
          return (l as number) / (r as number);
        case "%":
          return (l as number) % (r as number);
        case "<":
          return (l as number) < (r as number);
        case ">":
          return (l as number) > (r as number);
        case "<=":
          return (l as number) <= (r as number);
        case ">=":
          return (l as number) >= (r as number);
        case "==":
          // eslint-disable-next-line eqeqeq
          return l == r;
        case "!=":
          // eslint-disable-next-line eqeqeq
          return l != r;
        case "===":
          return l === r;
        case "!==":
          return l !== r;
        default:
          throw new ExpressionError(`Unsupported operator: ${node.op}`);
      }
    }
    case "conditional":
      return evalNode(node.test, scope)
        ? evalNode(node.consequent, scope)
        : evalNode(node.alternate, scope);
  }
}

const astCache = new Map<string, Node>();

export function compile(expression: string): Node {
  const cached = astCache.get(expression);
  if (cached) return cached;
  const tokens = tokenize(expression);
  if (tokens.length === 0) {
    throw new ExpressionError("Empty expression");
  }
  const ast = new Parser(tokens).parse();
  astCache.set(expression, ast);
  return ast;
}

export function evaluate(expression: string, scope: Record<string, unknown>): unknown {
  return evalNode(compile(expression), scope);
}
