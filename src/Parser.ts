import Token from "./Token";
import TokenType, { tokenTypesList } from "./TokenType";
import ExpressionNode from "./AST/ExpressionNode";
import StatementsNode from "./AST/StatementsNode";
import NumberNode from "./AST/NumberNode";
import VariableNode from "./AST/VariableNode";
import BinOperationNode from "./AST/BinOperationNode";
import UnarOperationNode from "./AST/UnarOperationNode";
import StringNode from "./AST/StringNode";

export default class Parser {
  tokens: Token[];
  pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  // Method to match tokens
  match(...expected: TokenType[]): Token | null {
    if (this.pos < this.tokens.length) {
      const currentToken = this.tokens[this.pos];
      if (expected.find((type) => type.name === currentToken.type.name)) {
        this.pos += 1;
        return currentToken;
      }
    }
    return null;
  }

  // Method to require tokens
  require(...expected: TokenType[]): Token {
    const token = this.match(...expected);
    if (!token) {
      throw new Error(
        `Expected ${expected.map((t) => t.name).join(" or ")} at position: ${
          this.pos
        }`
      );
    }
    return token;
  }

  // Parse variable or data types
  parseVariableOrDataTypes(): ExpressionNode {
    const number = this.match(tokenTypesList.NUMBER);
    if (number != null) {
      return new NumberNode(number);
    }
    const variable = this.match(tokenTypesList.VARIABLE);
    if (variable != null) {
      return new VariableNode(variable);
    }
    const string = this.match(tokenTypesList.STRING);
    if (string != null) {
      return new StringNode(string);
    }
    throw new Error(
      `Expecting a variable, number, or string at position: ${this.pos}`
    );
  }

  // Parse print statement
  parsePrint(): ExpressionNode {
    const operatorLog = this.match(tokenTypesList.LOG);
    if (operatorLog != null) {
      return new UnarOperationNode(operatorLog, this.parseFormula());
    }
    throw new Error(`Expecting a unary operator at position: ${this.pos}`);
  }

  // Parse parentheses
  parseParentheses(): ExpressionNode {
    if (this.match(tokenTypesList.LPAR) != null) {
      const node = this.parseFormula();
      this.require(tokenTypesList.RPAR);

      return node;
    } else {
      return this.parseVariableOrDataTypes();
    }
  }

  // Parse braces
  parseBraces(): ExpressionNode {
    if (this.match(tokenTypesList.LBRACE) != null) {
      const node = this.parseContext();

      this.pos -= 1;

      this.require(tokenTypesList.RBRACE);
      return node;
    } else {
      throw new Error(`Expecting { at position: ${this.pos}`);
    }
  }

  // Parse formula
  parseFormula(): ExpressionNode {
    let leftNode = this.parseParentheses();
    let operator = this.match(
      tokenTypesList.MINUS,
      tokenTypesList.PLUS,
      tokenTypesList.MULT,
      tokenTypesList.DIV,
      tokenTypesList.EQUAL,
      tokenTypesList.LESS,
      tokenTypesList.MORE,
      tokenTypesList.LESSEQ,
      tokenTypesList.MOREQ
    );
    while (operator != null) {
      let rightNode = this.parseParentheses();
      leftNode = new BinOperationNode(operator, leftNode, rightNode);
      operator = this.match(
        tokenTypesList.MINUS,
        tokenTypesList.PLUS,
        tokenTypesList.MULT,
        tokenTypesList.DIV,
        tokenTypesList.EQUAL,
        tokenTypesList.LESS,
        tokenTypesList.MORE,
        tokenTypesList.LESSEQ,
        tokenTypesList.MOREQ
      );
    }
    return leftNode;
  }

  // Parse expression
  parseExpression(): ExpressionNode {
    // Parse not variable
    if (this.match(tokenTypesList.VARIABLE) === null) {
      if (this.match(tokenTypesList.LOG) !== null) {
        this.pos -= 1;
        const printNode = this.parsePrint();

        return printNode;
      }
      return this.parseBraces();
    }

    // Parse variable
    this.pos -= 1;
    let variableNode = this.parseVariableOrDataTypes();
    const assignOperator = this.match(tokenTypesList.ASSIGN);
    if (assignOperator != null) {
      const rightFormulaNode = this.parseFormula();
      const binaryNode = new BinOperationNode(
        assignOperator,
        variableNode,
        rightFormulaNode
      );
      return binaryNode;
    }
    throw new Error(
      `After the variable, an assignment operator is expected at position: ${this.pos}`
    );
  }

  // Parse context
  parseContext(): ExpressionNode {
    const root = new StatementsNode();
    while (
      this.pos < this.tokens.length &&
      this.match(tokenTypesList.RBRACE) === null
    ) {
      const codeStringNode = this.parseExpression();
      this.require(tokenTypesList.SEMICOLON);

      root.addNode(codeStringNode);
    }
    return root;
  }

  parseCode(): ExpressionNode {
    return this.parseContext();
  }
}
